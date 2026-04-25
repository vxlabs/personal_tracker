using System.Net;
using System.Text;
using System.Text.RegularExpressions;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

/// <summary>
/// Extracts content from a URL and converts it to clean markdown saved in vault/raw/.
/// Generic articles use ReverseMarkdown; site-specific extractors handle Twitter, Reddit, YouTube, etc.
/// </summary>
public partial class ContentExtractorService(
    IConfiguration configuration,
    ILogger<ContentExtractorService> logger,
    IHttpClientFactory httpClientFactory)
{
    private string VaultRoot => configuration["Protocol:VaultDirectory"]
        ?? throw new InvalidOperationException("Protocol:VaultDirectory is not configured.");

    /// <summary>Extracts content from the given URL and saves it as a raw source in the vault.</summary>
    public async Task<VaultSource> ExtractAndSaveAsync(
        string url,
        string[] tags,
        string? userNote,
        CancellationToken ct = default)
    {
        var sourceType = DetectSourceType(url);
        logger.LogInformation("Extracting {SourceType} from {Url}", sourceType, url);

        var (title, markdown) = sourceType switch
        {
            "reddit" => await ExtractRedditAsync(url, ct),
            "youtube" => await ExtractYouTubeAsync(url, ct),
            "github" => await ExtractGitHubAsync(url, ct),
            "arxiv" => await ExtractArXivAsync(url, ct),
            "twitter" => await ExtractTwitterAsync(url, ct),
            _ => await ExtractArticleAsync(url, ct)
        };

        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var slug = GenerateSlug(title);
        var fileName = $"{today}_{slug}.md";
        var rawDir = Path.Combine(VaultRoot, "raw");
        Directory.CreateDirectory(rawDir);
        var filePath = Path.Combine(rawDir, fileName);

        // Ensure unique filename
        var counter = 1;
        while (File.Exists(filePath))
        {
            fileName = $"{today}_{slug}-{counter}.md";
            filePath = Path.Combine(rawDir, fileName);
            counter++;
        }

        var tagsYaml = tags.Length > 0
            ? $"[{string.Join(", ", tags)}]"
            : "[]";

        var capturedAt = DateTime.UtcNow.ToString("o");
        var frontmatter = $"""
            ---
            title: "{EscapeYaml(title)}"
            source_url: {url}
            source_type: {sourceType}
            captured_at: {capturedAt}
            tags: {tagsYaml}
            {(userNote is not null ? $"user_note: \"{EscapeYaml(userNote)}\"" : "")}
            status: captured
            ---

            """;

        await File.WriteAllTextAsync(filePath, frontmatter + markdown, ct);

        var relativePath = Path.GetRelativePath(VaultRoot, filePath).Replace('\\', '/');

        return new VaultSource
        {
            Url = url,
            Title = title,
            SourceType = sourceType,
            RawFilePath = relativePath,
            Slug = Path.GetFileNameWithoutExtension(fileName).Replace($"{today}_", ""),
            UserNote = userNote,
            TagsRaw = string.Join(",", tags),
            Status = "captured",
            CapturedAt = DateTime.UtcNow,
        };
    }

    // ── Generic Article ──────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractArticleAsync(string url, CancellationToken ct)
    {
        var client = httpClientFactory.CreateClient("extractor");
        string html;
        try
        {
            html = await client.GetStringAsync(url, ct);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Failed to fetch {Url}", url);
            return (url, $"*Failed to fetch content from {url}*");
        }

        var title = ExtractHtmlTitle(html);
        var markdown = ConvertHtmlToMarkdown(html);
        return (title, markdown);
    }

    // ── Reddit ────────────────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractRedditAsync(string url, CancellationToken ct)
    {
        var jsonUrl = url.TrimEnd('/') + ".json?limit=10&sort=top";
        var client = httpClientFactory.CreateClient("extractor");
        try
        {
            var json = await client.GetStringAsync(jsonUrl, ct);
            return ParseRedditJson(json, url);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Reddit extraction failed for {Url}", url);
            return await ExtractArticleAsync(url, ct);
        }
    }

    private static (string title, string markdown) ParseRedditJson(string json, string url)
    {
        // Lightweight JSON parsing without extra dependencies
        var titleMatch = Regex.Match(json, @"""title""\s*:\s*""([^""\\]*(?:\\.[^""\\]*)*)""");
        var selfTextMatch = Regex.Match(json, @"""selftext""\s*:\s*""([^""\\]*(?:\\.[^""\\]*)*)""");
        var authorMatch = Regex.Match(json, @"""author""\s*:\s*""([^""]+)""");
        var subredditMatch = Regex.Match(json, @"""subreddit_name_prefixed""\s*:\s*""([^""]+)""");

        var title = titleMatch.Success ? UnescapeJson(titleMatch.Groups[1].Value) : "Reddit Post";
        var selfText = selfTextMatch.Success ? UnescapeJson(selfTextMatch.Groups[1].Value) : "";
        var author = authorMatch.Success ? authorMatch.Groups[1].Value : "unknown";
        var subreddit = subredditMatch.Success ? subredditMatch.Groups[1].Value : "reddit";

        var sb = new StringBuilder();
        sb.AppendLine($"# {title}");
        sb.AppendLine();
        sb.AppendLine($"**Posted by:** u/{author} in {subreddit}");
        sb.AppendLine();

        if (!string.IsNullOrWhiteSpace(selfText))
        {
            sb.AppendLine("## Post");
            sb.AppendLine(selfText);
            sb.AppendLine();
        }

        // Extract top comments
        var commentMatches = Regex.Matches(json, @"""body""\s*:\s*""([^""\\]*(?:\\.[^""\\]*)*)""");
        var commentAuthorMatches = Regex.Matches(json, @"""author""\s*:\s*""([^""]+)""");

        if (commentMatches.Count > 1)
        {
            sb.AppendLine("## Top Comments");
            var maxComments = Math.Min(commentMatches.Count, 11);
            for (int i = 1; i < maxComments; i++)
            {
                var commentBody = UnescapeJson(commentMatches[i].Groups[1].Value);
                var commentAuthor = i < commentAuthorMatches.Count ? commentAuthorMatches[i].Value : "unknown";
                sb.AppendLine($"**u/{commentAuthor}:**");
                sb.AppendLine($"> {commentBody.Replace("\n", "\n> ")}");
                sb.AppendLine();
            }
        }

        return (title, sb.ToString());
    }

    // ── YouTube ───────────────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractYouTubeAsync(string url, CancellationToken ct)
    {
        // Extract video ID
        var videoId = ExtractYouTubeId(url);
        if (videoId is null) return await ExtractArticleAsync(url, ct);

        var client = httpClientFactory.CreateClient("extractor");
        var oEmbedUrl = $"https://www.youtube.com/oembed?url={Uri.EscapeDataString(url)}&format=json";

        string title = "YouTube Video";
        string channel = "";

        try
        {
            var json = await client.GetStringAsync(oEmbedUrl, ct);
            var titleMatch = Regex.Match(json, @"""title""\s*:\s*""([^""]+)""");
            var channelMatch = Regex.Match(json, @"""author_name""\s*:\s*""([^""]+)""");
            if (titleMatch.Success) title = titleMatch.Groups[1].Value;
            if (channelMatch.Success) channel = channelMatch.Groups[1].Value;
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "oEmbed fetch failed for YouTube {Url}", url);
        }

        // Attempt to get transcript via timedtext API
        var transcript = await TryGetYouTubeTranscriptAsync(videoId, client, ct);

        var sb = new StringBuilder();
        sb.AppendLine($"# {title}");
        sb.AppendLine();
        if (!string.IsNullOrEmpty(channel))
            sb.AppendLine($"**Channel:** {channel}");
        sb.AppendLine($"**URL:** {url}");
        sb.AppendLine();

        if (!string.IsNullOrEmpty(transcript))
        {
            sb.AppendLine("## Transcript");
            sb.AppendLine(transcript);
        }

        return (title, sb.ToString());
    }

    private static string? ExtractYouTubeId(string url)
    {
        var match = Regex.Match(url, @"(?:v=|youtu\.be/)([a-zA-Z0-9_-]{11})");
        return match.Success ? match.Groups[1].Value : null;
    }

    private static async Task<string> TryGetYouTubeTranscriptAsync(
        string videoId,
        HttpClient client,
        CancellationToken ct)
    {
        try
        {
            // YouTube timedtext API - language auto-detect
            var captionUrl = $"https://www.youtube.com/api/timedtext?v={videoId}&lang=en&fmt=json3";
            var json = await client.GetStringAsync(captionUrl, ct);

            var textMatches = Regex.Matches(json, @"""utf8""\s*:\s*""([^""]+)""");
            var offsetMatches = Regex.Matches(json, @"""tOffsetMs""\s*:\s*(\d+)");

            var sb = new StringBuilder();
            for (int i = 0; i < textMatches.Count; i++)
            {
                var text = UnescapeJson(textMatches[i].Groups[1].Value);
                if (i < offsetMatches.Count && int.TryParse(offsetMatches[i].Groups[1].Value, out var ms))
                {
                    var ts = TimeSpan.FromMilliseconds(ms);
                    sb.AppendLine($"[{ts:mm\\:ss}] {text}");
                }
                else
                {
                    sb.AppendLine(text);
                }
            }
            return sb.ToString();
        }
        catch
        {
            return string.Empty;
        }
    }

    // ── GitHub ────────────────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractGitHubAsync(string url, CancellationToken ct)
    {
        // Convert github.com/owner/repo to raw README URL
        var match = Regex.Match(url, @"github\.com/([^/]+)/([^/\?#]+)");
        if (!match.Success) return await ExtractArticleAsync(url, ct);

        var owner = match.Groups[1].Value;
        var repo = match.Groups[2].Value;

        var client = httpClientFactory.CreateClient("extractor");
        var readmeUrl = $"https://raw.githubusercontent.com/{owner}/{repo}/main/README.md";

        try
        {
            var content = await client.GetStringAsync(readmeUrl, ct);
            return ($"{owner}/{repo}", content);
        }
        catch
        {
            // Try master branch
            readmeUrl = readmeUrl.Replace("/main/", "/master/");
            try
            {
                var content = await client.GetStringAsync(readmeUrl, ct);
                return ($"{owner}/{repo}", content);
            }
            catch (Exception ex)
            {
                logger.LogWarning(ex, "GitHub README fetch failed for {Url}", url);
                return ($"{owner}/{repo}", $"# {owner}/{repo}\n\n*README not available.*");
            }
        }
    }

    // ── ArXiv ─────────────────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractArXivAsync(string url, CancellationToken ct)
    {
        var idMatch = Regex.Match(url, @"arxiv\.org/(?:abs|pdf)/(\d+\.\d+)");
        if (!idMatch.Success) return await ExtractArticleAsync(url, ct);

        var arxivId = idMatch.Groups[1].Value;
        var apiUrl = $"https://export.arxiv.org/abs/{arxivId}";

        var client = httpClientFactory.CreateClient("extractor");
        try
        {
            var html = await client.GetStringAsync(apiUrl, ct);

            var titleMatch = Regex.Match(html, @"<h1[^>]*class=""title[^""]*""[^>]*>.*?<span[^>]*>(.*?)</span>", RegexOptions.Singleline);
            var abstractMatch = Regex.Match(html, @"<blockquote[^>]*class=""abstract[^""]*""[^>]*>\s*<span[^>]*>Abstract:</span>(.*?)</blockquote>", RegexOptions.Singleline);
            var authorsMatch = Regex.Matches(html, @"<a[^>]*href=""/search/\?searchtype=author[^""]*""[^>]*>(.*?)</a>");

            var title = titleMatch.Success
                ? WebUtility.HtmlDecode(titleMatch.Groups[1].Value.Trim())
                : $"ArXiv {arxivId}";
            var abstractText = abstractMatch.Success
                ? WebUtility.HtmlDecode(StripHtml(abstractMatch.Groups[1].Value).Trim())
                : "";
            var authors = authorsMatch.Count > 0
                ? string.Join(", ", authorsMatch.Cast<Match>().Select(m => m.Groups[1].Value.Trim()))
                : "";

            var sb = new StringBuilder();
            sb.AppendLine($"# {title}");
            sb.AppendLine();
            if (!string.IsNullOrEmpty(authors))
                sb.AppendLine($"**Authors:** {authors}");
            sb.AppendLine($"**ArXiv:** https://arxiv.org/abs/{arxivId}");
            sb.AppendLine($"**PDF:** https://arxiv.org/pdf/{arxivId}");
            sb.AppendLine();
            if (!string.IsNullOrEmpty(abstractText))
            {
                sb.AppendLine("## Abstract");
                sb.AppendLine(abstractText);
            }

            return (title, sb.ToString());
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "ArXiv extraction failed for {Url}", url);
            return ($"ArXiv {arxivId}", $"# ArXiv {arxivId}\n\n*Content unavailable.*\n\n**URL:** {url}");
        }
    }

    // ── Twitter/X ─────────────────────────────────────────────────────────

    private async Task<(string title, string markdown)> ExtractTwitterAsync(string url, CancellationToken ct)
    {
        // Use oEmbed as a fallback (returns basic tweet info)
        var client = httpClientFactory.CreateClient("extractor");
        var oEmbedUrl = $"https://publish.twitter.com/oembed?url={Uri.EscapeDataString(url)}";
        try
        {
            var json = await client.GetStringAsync(oEmbedUrl, ct);
            var authorMatch = Regex.Match(json, @"""author_name""\s*:\s*""([^""]+)""");
            var htmlMatch = Regex.Match(json, @"""html""\s*:\s*""(.*?)""(?=\s*[,}])");

            var author = authorMatch.Success ? authorMatch.Groups[1].Value : "Unknown";
            var tweetHtml = htmlMatch.Success ? UnescapeJson(htmlMatch.Groups[1].Value) : "";
            var tweetText = StripHtml(tweetHtml);

            var title = $"Tweet by {author}";
            var markdown = $"# {title}\n\n{tweetText}\n\n**Source:** {url}";
            return (title, markdown);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Twitter oEmbed failed for {Url}, falling back to generic", url);
            return await ExtractArticleAsync(url, ct);
        }
    }

    // ── Manual Note ───────────────────────────────────────────────────────

    public async Task<VaultSource> SaveNoteAsync(
        string noteContent,
        string[] tags,
        string? userNote,
        CancellationToken ct = default)
    {
        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var titleLine = noteContent.Split('\n')[0].TrimStart('#').Trim();
        var title = string.IsNullOrEmpty(titleLine) ? "Note" : titleLine[..Math.Min(60, titleLine.Length)];
        var slug = GenerateSlug(title);
        var fileName = $"{today}_{slug}.md";
        var rawDir = Path.Combine(VaultRoot, "raw");
        Directory.CreateDirectory(rawDir);
        var filePath = Path.Combine(rawDir, fileName);

        var counter = 1;
        while (File.Exists(filePath))
        {
            fileName = $"{today}_{slug}-{counter}.md";
            filePath = Path.Combine(rawDir, fileName);
            counter++;
        }

        var tagsYaml = tags.Length > 0 ? $"[{string.Join(", ", tags)}]" : "[]";
        var capturedAt = DateTime.UtcNow.ToString("o");

        var frontmatter = $"""
            ---
            title: "{EscapeYaml(title)}"
            source_url: ""
            source_type: note
            captured_at: {capturedAt}
            tags: {tagsYaml}
            {(userNote is not null ? $"user_note: \"{EscapeYaml(userNote)}\"" : "")}
            status: captured
            ---

            """;

        await File.WriteAllTextAsync(filePath, frontmatter + noteContent, ct);

        var relativePath = Path.GetRelativePath(VaultRoot, filePath).Replace('\\', '/');

        return new VaultSource
        {
            Url = "",
            Title = title,
            SourceType = "note",
            RawFilePath = relativePath,
            Slug = Path.GetFileNameWithoutExtension(fileName).Replace($"{today}_", ""),
            UserNote = userNote,
            TagsRaw = string.Join(",", tags),
            Status = "captured",
            CapturedAt = DateTime.UtcNow,
        };
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static string ConvertHtmlToMarkdown(string html)
    {
        var config = new ReverseMarkdown.Config
        {
            UnknownTags = ReverseMarkdown.Config.UnknownTagsOption.PassThrough,
            GithubFlavored = true,
            RemoveComments = true,
            SmartHrefHandling = true,
        };
        var converter = new ReverseMarkdown.Converter(config);
        return converter.Convert(html);
    }

    private static string ExtractHtmlTitle(string html)
    {
        var match = Regex.Match(html, @"<title[^>]*>([^<]+)</title>", RegexOptions.IgnoreCase);
        return match.Success
            ? WebUtility.HtmlDecode(match.Groups[1].Value.Trim())
            : "Untitled";
    }

    private static string StripHtml(string html) =>
        Regex.Replace(WebUtility.HtmlDecode(html), @"<[^>]+>", " ").Trim();

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant();
        slug = Regex.Replace(slug, @"[^\w\s-]", "");
        slug = Regex.Replace(slug, @"\s+", "-");
        slug = Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        if (slug.Length > 60) slug = slug[..60].TrimEnd('-');
        return string.IsNullOrEmpty(slug) ? "untitled" : slug;
    }

    private static string EscapeYaml(string value) =>
        value.Replace("\\", "\\\\").Replace("\"", "\\\"");

    private static string UnescapeJson(string value) =>
        value.Replace("\\n", "\n").Replace("\\t", "\t").Replace("\\\"", "\"").Replace("\\\\", "\\");

    public static string DetectSourceType(string url)
    {
        if (string.IsNullOrEmpty(url)) return "article";
        var uri = url.ToLowerInvariant();
        if (uri.Contains("twitter.com") || uri.Contains("x.com")) return "twitter";
        if (uri.Contains("reddit.com")) return "reddit";
        if (uri.Contains("youtube.com") || uri.Contains("youtu.be")) return "youtube";
        if (uri.Contains("github.com")) return "github";
        if (uri.Contains("arxiv.org")) return "arxiv";
        if (uri.EndsWith(".pdf")) return "pdf";
        return "article";
    }
}
