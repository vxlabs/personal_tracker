using System.Text.RegularExpressions;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

/// <summary>
/// Watches the vault wiki/ directory for .md file changes and keeps the
/// WikiPageIndex SQLite table in sync with what Claude Code writes to disk.
/// </summary>
public partial class VaultFileWatcher : IDisposable
{
    private readonly IConfiguration _configuration;
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<VaultFileWatcher> _logger;
    private FileSystemWatcher? _watcher;
    private Timer? _debounceTimer;
    private readonly HashSet<string> _pendingPaths = [];
    private readonly object _lock = new();

    private string VaultRoot => _configuration["Protocol:VaultDirectory"]
        ?? throw new InvalidOperationException("Protocol:VaultDirectory is not configured.");

    public VaultFileWatcher(
        IConfiguration configuration,
        IServiceScopeFactory scopeFactory,
        ILogger<VaultFileWatcher> logger)
    {
        _configuration = configuration;
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void Start()
    {
        var wikiDir = Path.Combine(VaultRoot, "wiki");
        Directory.CreateDirectory(wikiDir);
        if (!Directory.Exists(wikiDir))
        {
            _logger.LogWarning("Wiki directory {WikiDir} could not be created; watcher not started.", wikiDir);
            return;
        }

        _watcher = new FileSystemWatcher(wikiDir, "*.md")
        {
            IncludeSubdirectories = true,
            NotifyFilter = NotifyFilters.LastWrite | NotifyFilters.FileName | NotifyFilters.DirectoryName
        };

        _watcher.Changed += OnChanged;
        _watcher.Created += OnChanged;
        _watcher.Deleted += OnDeleted;
        _watcher.Renamed += OnRenamed;
        _watcher.EnableRaisingEvents = true;

        _logger.LogInformation("VaultFileWatcher started on {WikiDir}", wikiDir);
    }

    private void OnChanged(object sender, FileSystemEventArgs e)
    {
        lock (_lock)
        {
            _pendingPaths.Add(e.FullPath);
            ScheduleDebounce();
        }
    }

    private void OnDeleted(object sender, FileSystemEventArgs e)
    {
        _ = Task.Run(() => RemovePageAsync(e.FullPath));
    }

    private void OnRenamed(object sender, RenamedEventArgs e)
    {
        lock (_lock)
        {
            _pendingPaths.Add(e.FullPath);
            ScheduleDebounce();
        }
        _ = Task.Run(() => RemovePageAsync(e.OldFullPath));
    }

    private void ScheduleDebounce()
    {
        _debounceTimer?.Dispose();
        _debounceTimer = new Timer(ProcessPendingPaths, null, 500, Timeout.Infinite);
    }

    private void ProcessPendingPaths(object? state)
    {
        string[] paths;
        lock (_lock)
        {
            paths = [.. _pendingPaths];
            _pendingPaths.Clear();
        }

        _ = Task.Run(async () =>
        {
            foreach (var path in paths)
                await ReindexPageAsync(path);
        });
    }

    public async Task ReindexPageAsync(string fullPath)
    {
        if (!File.Exists(fullPath)) return;

        try
        {
            var content = await File.ReadAllTextAsync(fullPath);
            var parsed = ParseWikiPage(fullPath, content);
            if (parsed is null) return;

            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ProtocolDbContext>();

            var relativePath = GetRelativePath(fullPath);
            var existing = await db.WikiPages.FirstOrDefaultAsync(p => p.FilePath == relativePath);

            if (existing is null)
            {
                db.WikiPages.Add(parsed);
            }
            else
            {
                existing.Title = parsed.Title;
                existing.PageType = parsed.PageType;
                existing.Summary = parsed.Summary;
                existing.Content = parsed.Content;
                existing.TagsRaw = parsed.TagsRaw;
                existing.BackLinksRaw = parsed.BackLinksRaw;
                existing.Confidence = parsed.Confidence;
                existing.CreatedAt = parsed.CreatedAt;
                existing.UpdatedAt = parsed.UpdatedAt;
            }

            await db.SaveChangesAsync();
            _logger.LogDebug("Re-indexed wiki page: {RelativePath}", relativePath);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to re-index {Path}", fullPath);
        }
    }

    private async Task RemovePageAsync(string fullPath)
    {
        try
        {
            using var scope = _scopeFactory.CreateScope();
            var db = scope.ServiceProvider.GetRequiredService<ProtocolDbContext>();
            var relativePath = GetRelativePath(fullPath);
            var existing = await db.WikiPages.FirstOrDefaultAsync(p => p.FilePath == relativePath);
            if (existing is not null)
            {
                db.WikiPages.Remove(existing);
                await db.SaveChangesAsync();
                _logger.LogInformation("Removed wiki page index: {RelativePath}", relativePath);
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to remove index for {Path}", fullPath);
        }
    }

    /// <summary>Reindexes all wiki pages from disk (full re-sync).</summary>
    public async Task SyncAllAsync()
    {
        var wikiDir = Path.Combine(VaultRoot, "wiki");
        if (!Directory.Exists(wikiDir)) return;

        var files = Directory.GetFiles(wikiDir, "*.md", SearchOption.AllDirectories);
        _logger.LogInformation("Full wiki sync: processing {Count} files", files.Length);

        foreach (var file in files)
            await ReindexPageAsync(file);
    }

    private WikiPageIndex? ParseWikiPage(string fullPath, string content)
    {
        var relativePath = GetRelativePath(fullPath);
        var now = DateTime.UtcNow;

        var frontmatter = ExtractFrontmatter(content);
        var bodyContent = RemoveFrontmatter(content);

        var title = frontmatter.GetValueOrDefault("title", Path.GetFileNameWithoutExtension(fullPath));
        var pageType = frontmatter.GetValueOrDefault("page_type", InferPageType(relativePath));
        var confidence = frontmatter.GetValueOrDefault("confidence", "medium");
        var tagsRaw = frontmatter.GetValueOrDefault("tags", "");
        var createdStr = frontmatter.GetValueOrDefault("created", now.ToString("yyyy-MM-dd"));
        var updatedStr = frontmatter.GetValueOrDefault("updated", now.ToString("yyyy-MM-dd"));

        var summary = ExtractSection(bodyContent, "Summary");
        var backlinks = ExtractBacklinks(bodyContent);

        if (!DateTime.TryParse(createdStr, out var createdAt)) createdAt = now;
        if (!DateTime.TryParse(updatedStr, out var updatedAt)) updatedAt = now;

        return new WikiPageIndex
        {
            FilePath = relativePath,
            Title = title,
            PageType = pageType,
            Summary = summary,
            Content = bodyContent,
            TagsRaw = tagsRaw,
            BackLinksRaw = string.Join(",", backlinks),
            Confidence = confidence,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };
    }

    private static Dictionary<string, string> ExtractFrontmatter(string content)
    {
        var result = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var match = FrontmatterRegex().Match(content);
        if (!match.Success) return result;

        var yaml = match.Groups[1].Value;
        foreach (var line in yaml.Split('\n'))
        {
            var colonIdx = line.IndexOf(':');
            if (colonIdx <= 0) continue;
            var key = line[..colonIdx].Trim();
            var value = line[(colonIdx + 1)..].Trim().Trim('"');
            if (!string.IsNullOrEmpty(key))
                result[key] = value;
        }

        return result;
    }

    private static string RemoveFrontmatter(string content)
    {
        var match = FrontmatterRegex().Match(content);
        return match.Success ? content[match.Length..].TrimStart() : content;
    }

    private static string ExtractSection(string content, string sectionName)
    {
        var pattern = $@"##\s+{Regex.Escape(sectionName)}\s*\n([\s\S]*?)(?=\n##\s|\z)";
        var match = Regex.Match(content, pattern, RegexOptions.IgnoreCase);
        if (!match.Success) return string.Empty;

        var text = match.Groups[1].Value.Trim();
        // Return at most first 3 sentences
        var sentences = text.Split('.', 4);
        return string.Join('.', sentences.Take(3)).Trim();
    }

    private static List<string> ExtractBacklinks(string content)
    {
        var matches = BacklinkRegex().Matches(content);
        return matches.Select(m => m.Groups[1].Value.Trim()).Distinct().ToList();
    }

    private static string InferPageType(string relativePath) =>
        relativePath switch
        {
            var p when p.Contains("/entities/") => "entity",
            var p when p.Contains("/concepts/") => "concept",
            var p when p.Contains("/topics/") => "topic",
            var p when p.Contains("/sources/") => "source",
            var p when p.Contains("/syntheses/") => "synthesis",
            _ => "page"
        };

    private string GetRelativePath(string fullPath)
    {
        var relative = Path.GetRelativePath(VaultRoot, fullPath);
        return relative.Replace('\\', '/');
    }

    [GeneratedRegex(@"^---\s*\n([\s\S]*?)\n---\s*\n?", RegexOptions.Multiline)]
    private static partial Regex FrontmatterRegex();

    [GeneratedRegex(@"\[\[([^\]]+)\]\]")]
    private static partial Regex BacklinkRegex();

    public void Dispose()
    {
        _watcher?.Dispose();
        _debounceTimer?.Dispose();
        GC.SuppressFinalize(this);
    }
}
