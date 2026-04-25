using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;

namespace Protocol.Api.Services;

/// <summary>
/// Full-text search over wiki pages using SQLite FTS5.
/// </summary>
public class WikiSearchService(
    ProtocolDbContext db,
    ILogger<WikiSearchService> logger)
{
    private string DbConnectionString =>
        db.Database.GetDbConnection().ConnectionString;

    public async Task<IReadOnlyList<WikiSearchResult>> SearchAsync(string query, string? pageType, int limit = 20)
    {
        if (string.IsNullOrWhiteSpace(query)) return [];

        var ftsQuery = SanitizeFtsQuery(query);

        try
        {
            var results = new List<WikiSearchResult>();
            using var connection = new SqliteConnection(DbConnectionString);
            await connection.OpenAsync();

            var whereClause = string.IsNullOrEmpty(pageType)
                ? ""
                : "AND wp.PageType = @pageType";

            var sql = $"""
                SELECT
                    wp.Id,
                    wp.FilePath,
                    wp.Title,
                    wp.PageType,
                    snippet(wiki_fts, 3, '<mark>', '</mark>', '...', 64) AS Snippet,
                    rank
                FROM wiki_fts
                JOIN WikiPages wp ON wp.FilePath = wiki_fts.file_path
                WHERE wiki_fts MATCH @query
                {whereClause}
                ORDER BY rank
                LIMIT @limit
                """;

            using var cmd = connection.CreateCommand();
            cmd.CommandText = sql;
            cmd.Parameters.AddWithValue("@query", ftsQuery);
            cmd.Parameters.AddWithValue("@limit", limit);
            if (!string.IsNullOrEmpty(pageType))
                cmd.Parameters.AddWithValue("@pageType", pageType);

            using var reader = await cmd.ExecuteReaderAsync();
            var rank = 1;
            while (await reader.ReadAsync())
            {
                results.Add(new WikiSearchResult(
                    Id: reader.GetInt32(0),
                    FilePath: reader.GetString(1),
                    Title: reader.GetString(2),
                    PageType: reader.GetString(3),
                    Snippet: reader.IsDBNull(4) ? "" : reader.GetString(4),
                    Rank: rank++
                ));
            }

            logger.LogDebug("FTS5 search '{Query}' → {Count} results", query, results.Count);
            return results;
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "FTS5 search failed for '{Query}', falling back", query);
            return await FallbackSearchAsync(query, pageType, limit);
        }
    }

    private async Task<IReadOnlyList<WikiSearchResult>> FallbackSearchAsync(string query, string? pageType, int limit)
    {
        var q = db.WikiPages.AsQueryable();
        if (!string.IsNullOrEmpty(pageType)) q = q.Where(p => p.PageType == pageType);

        var pages = await q
            .Where(p => EF.Functions.Like(p.Title, "%" + query + "%") ||
                        EF.Functions.Like(p.Summary, "%" + query + "%") ||
                        EF.Functions.Like(p.Content, "%" + query + "%"))
            .Take(limit)
            .Select(p => new { p.Id, p.FilePath, p.Title, p.PageType, p.Summary })
            .ToListAsync();

        return pages.Select((p, i) => new WikiSearchResult(
            Id: p.Id,
            FilePath: p.FilePath,
            Title: p.Title,
            PageType: p.PageType,
            Snippet: p.Summary,
            Rank: i + 1
        )).ToList();
    }

    private static string SanitizeFtsQuery(string query)
    {
        var cleaned = query
            .Replace("\"", "")
            .Replace("'", "")
            .Replace("*", "")
            .Replace("(", "")
            .Replace(")", "")
            .Trim();

        if (string.IsNullOrEmpty(cleaned)) return "\"\"";

        var tokens = cleaned.Split(' ', StringSplitOptions.RemoveEmptyEntries);
        return string.Join(" ", tokens.Select(t => $"\"{t}\""));
    }
}

public record WikiSearchResult(
    int Id,
    string FilePath,
    string Title,
    string PageType,
    string Snippet,
    int Rank);
