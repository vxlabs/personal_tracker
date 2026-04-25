using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

/// <summary>
/// Auto-compiles raw source documents into wiki pages using the configured CLI agent.
/// Also provides AI deep search and synthesis filing.
/// </summary>
public class WikiCompileService(
    ProtocolDbContext db,
    VaultFileWatcher fileWatcher,
    WikiAgentService agentService,
    IConfiguration configuration,
    ILogger<WikiCompileService> logger)
{
    private static readonly JsonSerializerOptions FileOperationJsonOptions = new()
    {
        PropertyNameCaseInsensitive = true
    };

    private string VaultRoot => configuration["Protocol:VaultDirectory"]!;

    // ── Compile ───────────────────────────────────────────────────────────

    public async Task CompileSourceAsync(VaultSource source)
    {
        var rawPath = Path.Combine(VaultRoot, source.RawFilePath.Replace('/', Path.DirectorySeparatorChar));
        if (!File.Exists(rawPath))
            throw new FileNotFoundException($"Raw file not found: {rawPath}");

        var rawContent = await File.ReadAllTextAsync(rawPath);
        var schemaPath = Path.Combine(VaultRoot, "WIKI-SCHEMA.md");
        var schema = File.Exists(schemaPath) ? await File.ReadAllTextAsync(schemaPath) : "";
        var indexPath = Path.Combine(VaultRoot, "index.md");
        var index = File.Exists(indexPath) ? await File.ReadAllTextAsync(indexPath) : "";

        var prompt = BuildCompilePrompt(rawContent, schema, index);

        try
        {
            var result = await agentService.RunAsync(new WikiAgentRunRequest(
                "compile",
                prompt,
                RawFilePath: source.RawFilePath));

            if (!result.Success)
                throw new InvalidOperationException(BuildAgentFailure(result));

            var operationCount = await ExecuteFileOperationsAsync(result.Stdout, source);
            if (operationCount == 0)
                throw new InvalidOperationException("Wiki agent returned no executable file operations.");

            source.Status = "compiled";
            source.CompiledAt = DateTime.UtcNow;
            await db.SaveChangesAsync();

            await fileWatcher.SyncAllAsync();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Wiki agent compilation failed for source {Slug}", source.Slug);
            source.Status = "error";
            await db.SaveChangesAsync();
            throw;
        }
    }

    private static string BuildCompilePrompt(string rawContent, string schema, string index)
    {
        const string jsonSchema =
            "[\n" +
            "  {\n" +
            "    \"operation\": \"create\" | \"update\" | \"update_index\" | \"append_log\",\n" +
            "    \"path\": \"relative/path/from/vault/root.md\",\n" +
            "    \"content\": \"full file content as a string\"\n" +
            "  }\n" +
            "]";

        return "# Compilation Task\n\n" +
               "Process the following raw source document and create/update the appropriate wiki pages.\n" +
               "Follow the WIKI-SCHEMA.md instructions precisely.\n\n" +
               "Return a JSON array of file operations in this exact format:\n" +
               jsonSchema + "\n\n" +
               "Do not include any text outside the JSON array.\n\n" +
               "You are a knowledge wiki compiler. When given a raw source document, a schema file, and the current index, create or update wiki pages following the schema exactly.\n\n" +
               "## WIKI-SCHEMA.md\n" + schema + "\n\n" +
               "## Current index.md\n" + index + "\n\n" +
               "## Raw Source to Process\n" + rawContent;
    }

    private async Task<int> ExecuteFileOperationsAsync(string json, VaultSource source)
    {
        // Strip any markdown code fences the LLM may have wrapped the JSON array in.
        json = WikiAgentService.StripMarkdownCodeFences(json);

        var jsonStart = json.IndexOf('[');
        var jsonEnd = json.LastIndexOf(']');
        if (jsonStart < 0 || jsonEnd < 0)
        {
            throw new InvalidOperationException(
                $"Wiki agent did not return a JSON array of file operations. Output preview: {Preview(json)}");
        }

        var jsonArray = json[jsonStart..(jsonEnd + 1)];
        List<FileOperation>? operations;
        try
        {
            operations = JsonSerializer.Deserialize<List<FileOperation>>(jsonArray, FileOperationJsonOptions);
        }
        catch (JsonException ex)
        {
            throw new InvalidOperationException(
                $"Wiki agent returned malformed JSON operations: {ex.Message}. Output preview: {Preview(jsonArray)}",
                ex);
        }

        if (operations is null || operations.Count == 0)
            throw new InvalidOperationException("Wiki agent returned an empty file operation list.");

        var executed = 0;
        foreach (var op in operations)
        {
            if (string.IsNullOrEmpty(op.Path) || string.IsNullOrEmpty(op.Content)) continue;

            var safePath = op.Path.Replace("..", "").TrimStart('/');
            var vaultFullPath = Path.GetFullPath(VaultRoot);
            var fullPath = Path.GetFullPath(Path.Combine(VaultRoot, safePath.Replace('/', Path.DirectorySeparatorChar)));
            var isInsideVault = fullPath.Equals(vaultFullPath, StringComparison.OrdinalIgnoreCase) ||
                fullPath.StartsWith(vaultFullPath + Path.DirectorySeparatorChar, StringComparison.OrdinalIgnoreCase);
            if (!isInsideVault)
                throw new InvalidOperationException($"Agent attempted to write outside the vault: {op.Path}");

            Directory.CreateDirectory(Path.GetDirectoryName(fullPath)!);

            if (string.Equals(op.Operation, "append_log", StringComparison.OrdinalIgnoreCase))
                await File.AppendAllTextAsync(fullPath, "\n" + op.Content);
            else
                await File.WriteAllTextAsync(fullPath, op.Content);

            logger.LogInformation("{Op} {Path}", op.Operation, safePath);
            executed++;
        }

        if (executed == 0)
        {
            throw new InvalidOperationException(
                "Wiki agent returned file operations, but none had both a path and content.");
        }

        return executed;
    }

    // ── Lint ──────────────────────────────────────────────────────────────

    public async Task<object> LintAsync()
    {
        var pages = await db.WikiPages.ToListAsync();
        var indexPath = Path.Combine(VaultRoot, "index.md");
        var index = File.Exists(indexPath) ? await File.ReadAllTextAsync(indexPath) : "";

        var pageList = string.Join("\n", pages.Select(p => $"- {p.FilePath} ({p.PageType}): {p.Title}"));

        var prompt =
            "Lint this wiki. Check for:\n" +
            "1. Orphan pages (no inbound links)\n" +
            "2. Broken [[backlinks]] (link target doesn't exist)\n" +
            "3. Pages missing required sections (Summary, Details, Sources, Related)\n" +
            "4. Missing confidence levels\n\n" +
            "Current wiki pages:\n" + pageList + "\n\n" +
            "Current index.md:\n" + index + "\n\n" +
            "Return only a JSON object with keys: orphans (array), brokenLinks (array), missingSections (array), summary (string).";

        var result = await agentService.RunAsync(new WikiAgentRunRequest("lint", prompt));
        if (!result.Success)
            return new { error = BuildAgentFailure(result) };

        var json = WikiAgentService.ExtractJsonObject(result.Stdout) ?? "{}";
        return System.Text.Json.JsonSerializer.Deserialize<object>(json) ?? new { text = result.Stdout };
    }

    // ── AI Search ─────────────────────────────────────────────────────────

    public async Task<object> AiSearchAsync(string query)
    {
        var indexPath = Path.Combine(VaultRoot, "index.md");
        var index = File.Exists(indexPath) ? await File.ReadAllTextAsync(indexPath) : "";

        var relevantPages = await db.WikiPages
            .Where(p => EF.Functions.Like(p.Content, "%" + query + "%") ||
                        EF.Functions.Like(p.Title, "%" + query + "%") ||
                        EF.Functions.Like(p.Summary, "%" + query + "%"))
            .Take(10)
            .ToListAsync();

        var pageContents = new StringBuilder();
        foreach (var page in relevantPages)
        {
            var fullPath = Path.Combine(VaultRoot, page.FilePath.Replace('/', Path.DirectorySeparatorChar));
            if (File.Exists(fullPath))
            {
                pageContents.AppendLine($"\n### {page.Title} ({page.FilePath})");
                pageContents.AppendLine(page.Content[..Math.Min(page.Content.Length, 2000)]);
            }
        }

        var indexPreview = index.Length > 1000 ? index[..1000] : index;

        var prompt =
            "Answer this question using ONLY the wiki content provided below.\n" +
            "Cite specific pages using their FilePath in parentheses after claims.\n" +
            "If the answer is not in the wiki, say so explicitly.\n\n" +
            "Question: " + query + "\n\n" +
            "Wiki Index:\n" + indexPreview + "\n\n" +
            "Relevant Wiki Pages:\n" + pageContents + "\n\n" +
            "Return only a JSON object with keys: answer (string with citations), citations (array of objects with title/path/relevance fields), canFile (boolean).";

        var result = await agentService.RunAsync(new WikiAgentRunRequest("ai-search", prompt, Query: query));
        if (!result.Success)
            return new { error = BuildAgentFailure(result) };

        var jsonStr = WikiAgentService.ExtractJsonObject(result.Stdout);
        if (jsonStr is not null)
        {
            return System.Text.Json.JsonSerializer.Deserialize<object>(jsonStr) ?? new { answer = result.Stdout };
        }
        return new { answer = result.Stdout };
    }

    // ── File Synthesis ────────────────────────────────────────────────────

    public async Task<string> FileSynthesisAsync(string query, string answer)
    {
        var today = DateTime.Today.ToString("yyyy-MM-dd");
        var slug = GenerateSlug(query);
        var fileName = $"synthesis_{today}_{slug}.md";
        var synthDir = Path.Combine(VaultRoot, "wiki", "syntheses");
        Directory.CreateDirectory(synthDir);
        var filePath = Path.Combine(synthDir, fileName);

        var answerPreview = answer.Length > 200 ? answer[..200] : answer;

        var content =
            "---\n" +
            $"title: \"{EscapeYaml(query)}\"\n" +
            "page_type: synthesis\n" +
            $"created: {today}\n" +
            $"updated: {today}\n" +
            "confidence: medium\n" +
            "tags: []\n" +
            "---\n\n" +
            "## Summary\n" +
            answerPreview + "\n\n" +
            "## Question\n" +
            query + "\n\n" +
            "## Answer\n" +
            answer + "\n\n" +
            "## Sources\n" +
            $"*Synthesized from wiki on {today}.*\n\n" +
            "## Related\n\n";

        await File.WriteAllTextAsync(filePath, content);

        var logPath = Path.Combine(VaultRoot, "log.md");
        await File.AppendAllTextAsync(logPath, $"\n## [{today}] synthesis | {query}\n");

        return Path.GetRelativePath(VaultRoot, filePath).Replace('\\', '/');
    }

    private static string GenerateSlug(string text)
    {
        var slug = text.ToLowerInvariant();
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"[^\w\s-]", "");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"\s+", "-");
        slug = System.Text.RegularExpressions.Regex.Replace(slug, @"-+", "-");
        slug = slug.Trim('-');
        if (slug.Length > 50) slug = slug[..50].TrimEnd('-');
        return string.IsNullOrEmpty(slug) ? "synthesis" : slug;
    }

    private static string EscapeYaml(string value) =>
        value.Replace("\\", "\\\\").Replace("\"", "\\\"");

    private static string BuildAgentFailure(WikiAgentRunResult result)
    {
        if (result.TimedOut) return $"Wiki agent '{result.Profile.Name}' timed out.";
        if (!string.IsNullOrWhiteSpace(result.Stderr)) return result.Stderr.Trim();
        if (result.ExitCode is not null && result.ExitCode != 0)
            return $"Wiki agent '{result.Profile.Name}' exited with code {result.ExitCode}.";
        return $"Wiki agent '{result.Profile.Name}' did not return output.";
    }

    private static string Preview(string value, int maxLength = 500)
    {
        value = value.Replace("\r", " ").Replace("\n", " ").Trim();
        return value.Length <= maxLength ? value : value[..maxLength] + "...";
    }

    private record FileOperation(string Operation, string Path, string Content);
}
