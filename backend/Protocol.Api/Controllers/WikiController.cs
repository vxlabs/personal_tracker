using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/wiki")]
public class WikiController(
    ProtocolDbContext db,
    ContentExtractorService extractor,
    WikiSearchService searchService,
    WikiCompileService compileService,
    VaultFileWatcher fileWatcher,
    XpService xpService,
    IConfiguration configuration,
    ILogger<WikiController> logger) : ControllerBase
{
    private string VaultRoot => configuration["Protocol:VaultDirectory"]!;

    // ── Capture ──────────────────────────────────────────────────────────

    // POST /api/wiki/capture
    [HttpPost("capture")]
    public async Task<IActionResult> Capture([FromBody] CaptureRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Url) && string.IsNullOrWhiteSpace(request.UserNote) && string.IsNullOrWhiteSpace(request.Note))
            return BadRequest(new { error = "Either url or note is required." });

        try
        {
            VaultSource source;

            if (string.IsNullOrWhiteSpace(request.Url))
            {
                // Manual note capture — UserNote is the body, Note/Title is optional heading
                var noteBody = request.UserNote ?? request.Note ?? "";
                var noteTitle = request.Title ?? request.Note ?? "";
                var fullNote = string.IsNullOrEmpty(noteTitle) || noteTitle == noteBody
                    ? noteBody
                    : $"# {noteTitle}\n\n{noteBody}";
                source = await extractor.SaveNoteAsync(fullNote, request.Tags ?? [], null);
            }
            else
            {
                source = await extractor.ExtractAndSaveAsync(
                    request.Url!,
                    request.Tags ?? [],
                    request.UserNote);
            }

            db.VaultSources.Add(source);
            await db.SaveChangesAsync();

            // Award XP for capturing a wiki source
            var xpDelta = await xpService.OnWikiCaptureAsync(source.Id);

            return Ok(new { source = SourceDto(source), xp = xpDelta });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Capture failed for {Url}", request.Url);
            return StatusCode(500, new { error = "Extraction failed.", detail = ex.Message });
        }
    }

    // GET /api/wiki/sources
    [HttpGet("sources")]
    public async Task<IActionResult> GetSources(
        [FromQuery] string? status,
        [FromQuery] string? type,
        [FromQuery] int limit = 100)
    {
        var query = db.VaultSources.AsQueryable();
        if (!string.IsNullOrEmpty(status)) query = query.Where(s => s.Status == status);
        if (!string.IsNullOrEmpty(type)) query = query.Where(s => s.SourceType == type);

        var sources = await query
            .OrderByDescending(s => s.CapturedAt)
            .Take(limit)
            .ToListAsync();

        return Ok(sources.Select(SourceDto));
    }

    // GET /api/wiki/sources/{id}
    [HttpGet("sources/{id:int}")]
    public async Task<IActionResult> GetSource(int id)
    {
        var source = await db.VaultSources.FindAsync(id);
        if (source is null) return NotFound();

        // Also return file content if it exists
        var fullPath = Path.Combine(VaultRoot, source.RawFilePath.Replace('/', Path.DirectorySeparatorChar));
        string? rawContent = null;
        if (System.IO.File.Exists(fullPath))
            rawContent = await System.IO.File.ReadAllTextAsync(fullPath);

        return Ok(new { source = SourceDto(source), rawContent });
    }

    // DELETE /api/wiki/sources/{id}
    [HttpDelete("sources/{id:int}")]
    public async Task<IActionResult> DeleteSource(int id)
    {
        var source = await db.VaultSources.FindAsync(id);
        if (source is null) return NotFound();
        db.VaultSources.Remove(source);
        await db.SaveChangesAsync();
        return NoContent();
    }

    // ── Browse ────────────────────────────────────────────────────────────

    // GET /api/wiki/index
    [HttpGet("index")]
    public async Task<IActionResult> GetIndex()
    {
        var indexPath = Path.Combine(VaultRoot, "index.md");
        if (!System.IO.File.Exists(indexPath))
            return Ok(new { content = "" });
        var content = await System.IO.File.ReadAllTextAsync(indexPath);
        return Ok(new { content });
    }

    // GET /api/wiki/page?path=wiki/concepts/attention-mechanism.md
    [HttpGet("page")]
    public async Task<IActionResult> GetPage([FromQuery] string path)
    {
        if (string.IsNullOrEmpty(path)) return BadRequest();

        // Security: prevent path traversal
        var safePath = path.Replace("..", "").TrimStart('/');
        var fullPath = Path.Combine(VaultRoot, safePath.Replace('/', Path.DirectorySeparatorChar));
        if (!fullPath.StartsWith(VaultRoot)) return BadRequest(new { error = "Invalid path." });

        if (!System.IO.File.Exists(fullPath))
            return NotFound(new { error = $"Page not found: {safePath}" });

        var content = await System.IO.File.ReadAllTextAsync(fullPath);
        var indexEntry = await db.WikiPages.FirstOrDefaultAsync(p => p.FilePath == safePath);

        // Find pages that link to this page using its title/slug
        var backlinkers = await db.WikiPages
            .Where(p => !string.IsNullOrEmpty(p.Content) && p.FilePath != safePath)
            .Select(p => p.FilePath)
            .ToListAsync();

        return Ok(new
        {
            id = indexEntry?.Id ?? 0,
            filePath = safePath,
            title = indexEntry?.Title ?? Path.GetFileNameWithoutExtension(safePath),
            pageType = indexEntry?.PageType ?? "page",
            summary = indexEntry?.Summary ?? "",
            content,
            tagsRaw = indexEntry?.TagsRaw ?? "",
            backLinksRaw = indexEntry?.BackLinksRaw ?? "",
            confidence = indexEntry?.Confidence ?? "medium",
            createdAt = indexEntry?.CreatedAt ?? DateTime.UtcNow,
            updatedAt = indexEntry?.UpdatedAt ?? DateTime.UtcNow,
        });
    }

    // GET /api/wiki/recent
    [HttpGet("recent")]
    public async Task<IActionResult> GetRecent([FromQuery] int limit = 20)
    {
        var pages = await db.WikiPages
            .OrderByDescending(p => p.UpdatedAt)
            .Take(limit)
            .Select(p => new {
                p.Id,
                p.FilePath,
                p.Title,
                p.PageType,
                p.Summary,
                p.TagsRaw,
                p.BackLinksRaw,
                p.Confidence,
                p.CreatedAt,
                p.UpdatedAt
            })
            .ToListAsync();
        return Ok(pages);
    }

    // GET /api/wiki/log
    [HttpGet("log")]
    public async Task<IActionResult> GetLog([FromQuery] int limit = 50)
    {
        var logPath = Path.Combine(VaultRoot, "log.md");
        if (!System.IO.File.Exists(logPath)) return Ok(new { entries = Array.Empty<object>() });

        var content = await System.IO.File.ReadAllTextAsync(logPath);
        var entries = content
            .Split("## [", StringSplitOptions.RemoveEmptyEntries)
            .Skip(1) // skip header before first entry
            .Select(e =>
            {
                var lines = e.Split('\n', 2);
                var header = "[" + lines[0].Trim();
                var body = lines.Length > 1 ? lines[1].Trim() : "";
                return new { header, body };
            })
            .Reverse()
            .Take(limit)
            .ToList();

        return Ok(new { entries });
    }

    // GET /api/wiki/graph
    [HttpGet("graph")]
    public async Task<IActionResult> GetGraph()
    {
        var pages = await db.WikiPages.ToListAsync();
        var nodes = pages.Select(p => new
        {
            id = p.FilePath,
            title = p.Title,
            pageType = p.PageType,
            backLinkCount = string.IsNullOrEmpty(p.BackLinksRaw) ? 0 : p.BackLinksRaw.Split(',').Length,
        }).ToList();

        var edges = new List<object>();
        foreach (var page in pages)
        {
            if (string.IsNullOrEmpty(page.BackLinksRaw)) continue;
            foreach (var link in page.BackLinksRaw.Split(',', StringSplitOptions.RemoveEmptyEntries))
            {
                var target = pages.FirstOrDefault(p =>
                    p.Title.Equals(link.Trim(), StringComparison.OrdinalIgnoreCase) ||
                    p.FilePath.Contains(link.Trim().ToLowerInvariant().Replace(" ", "-")));

                if (target is not null)
                    edges.Add(new { source = page.FilePath, target = target.FilePath });
            }
        }

        return Ok(new { nodes, edges });
    }

    // GET /api/wiki/stats
    [HttpGet("stats")]
    public async Task<IActionResult> GetStats()
    {
        var sourceCount = await db.VaultSources.CountAsync();
        var compiledSourceCount = await db.VaultSources.CountAsync(s => s.Status == "compiled");
        var failedSourceCount = await db.VaultSources.CountAsync(s => s.Status == "error");
        var pendingSourceCount = await db.VaultSources.CountAsync(s => s.Status == "captured" || s.Status == "error");
        var pageCount = await db.WikiPages.CountAsync();
        var entityCount = await db.WikiPages.CountAsync(p => p.PageType == "entity");
        var conceptCount = await db.WikiPages.CountAsync(p => p.PageType == "concept");
        var topicCount = await db.WikiPages.CountAsync(p => p.PageType == "topic");
        var synthesisCount = await db.WikiPages.CountAsync(p => p.PageType == "synthesis");

        var latestSource = await db.VaultSources
            .OrderByDescending(s => s.CapturedAt)
            .Select(s => s.CapturedAt)
            .FirstOrDefaultAsync();

        var latestPage = await db.WikiPages
            .OrderByDescending(p => p.UpdatedAt)
            .Select(p => p.UpdatedAt)
            .FirstOrDefaultAsync();

        return Ok(new
        {
            totalSources = sourceCount,
            compiledSources = compiledSourceCount,
            pendingSources = pendingSourceCount,
            failedSources = failedSourceCount,
            totalPages = pageCount,
            entityPages = entityCount,
            conceptPages = conceptCount,
            syntaxPages = topicCount,
            synthesiPages = synthesisCount,
            lastUpdated = latestPage == default ? null : (DateTime?)latestPage,
        });
    }

    // ── Compile ───────────────────────────────────────────────────────────

    // POST /api/wiki/compile/{sourceId}
    [HttpPost("compile/{sourceId:int}")]
    public async Task<IActionResult> CompileSource(int sourceId)
    {
        var source = await db.VaultSources.FindAsync(sourceId);
        if (source is null) return NotFound();

        try
        {
            await compileService.CompileSourceAsync(source);

            // Award XP for compiling a wiki page
            var xpDelta = await xpService.OnWikiCompileAsync(source.Id);
            return Ok(new { status = source.Status, xp = xpDelta });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Compile failed for source {SourceId}", sourceId);
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // POST /api/wiki/compile/batch
    [HttpPost("compile/batch")]
    public async Task<IActionResult> CompileBatch()
    {
        var unprocessed = await db.VaultSources
            .Where(s => s.Status == "captured" || s.Status == "error")
            .ToListAsync();

        var compiled = 0;
        var errors = new List<string>();
        foreach (var source in unprocessed)
        {
            try
            {
                await compileService.CompileSourceAsync(source);
                compiled++;
            }
            catch (Exception ex)
            {
                errors.Add($"{source.Slug}: {ex.Message}");
            }
        }

        return Ok(new { compiled, errors });
    }

    // POST /api/wiki/lint
    [HttpPost("lint")]
    public async Task<IActionResult> Lint()
    {
        try
        {
            var result = await compileService.LintAsync();
            return Ok(result);
        }
        catch (Exception ex)
        {
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── Search ────────────────────────────────────────────────────────────

    // GET /api/wiki/search?q=...
    [HttpGet("search")]
    public async Task<IActionResult> Search(
        [FromQuery] string q,
        [FromQuery] string? pageType,
        [FromQuery] int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(q))
            return BadRequest(new { error = "Query parameter 'q' is required." });

        var results = await searchService.SearchAsync(q, pageType, limit);
        return Ok(results);
    }
    // POST /api/wiki/search/ai
    [HttpPost("search/ai")]
    public async Task<IActionResult> AiSearch([FromBody] AiSearchRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Query))
            return BadRequest(new { error = "Query is required." });

        try
        {
            var result = await compileService.AiSearchAsync(request.Query);
            return Ok(result);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "AI search failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // POST /api/wiki/search/ai/file
    [HttpPost("search/ai/file")]
    public async Task<IActionResult> FileSynthesis([FromBody] FileSynthesisRequest request)
    {
        try
        {
            var path = await compileService.FileSynthesisAsync(request.Query, request.Answer);
            await fileWatcher.ReindexPageAsync(Path.Combine(VaultRoot, path.Replace('/', Path.DirectorySeparatorChar)));
            return Ok(new { path });
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "File synthesis failed");
            return StatusCode(500, new { error = ex.Message });
        }
    }

    // ── Sync ──────────────────────────────────────────────────────────────

    // POST /api/wiki/sync
    [HttpPost("sync")]
    public async Task<IActionResult> Sync()
    {
        await fileWatcher.SyncAllAsync();
        var pageCount = await db.WikiPages.CountAsync();
        return Ok(new { synced = true, pageCount });
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private static object SourceDto(VaultSource s) => new
    {
        s.Id,
        s.Url,
        s.Title,
        s.SourceType,
        s.RawFilePath,
        s.Slug,
        s.UserNote,
        tags = string.IsNullOrEmpty(s.TagsRaw) ? [] : s.TagsRaw.Split(','),
        s.Status,
        s.CapturedAt,
        s.CompiledAt,
    };
}

public record CaptureRequest(
    string? Url,
    string[]? Tags,
    string? UserNote,
    string? Note,
    string? Title);

public record AiSearchRequest(string Query);

public record FileSynthesisRequest(string Query, string Answer);
