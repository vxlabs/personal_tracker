namespace Protocol.Api.Models;

/// <summary>
/// Mirrors a wiki markdown file for fast in-app querying.
/// The LLM owns the actual .md files; this table is a queryable index rebuilt by the file watcher.
/// </summary>
public class WikiPageIndex
{
    public int Id { get; set; }

    /// <summary>Relative path from vault root, e.g. wiki/concepts/attention-mechanism.md</summary>
    public string FilePath { get; set; } = string.Empty;

    public string Title { get; set; } = string.Empty;

    /// <summary>entity | concept | topic | source | synthesis</summary>
    public string PageType { get; set; } = string.Empty;

    /// <summary>First 2-3 sentences extracted from the Summary section.</summary>
    public string Summary { get; set; } = string.Empty;

    /// <summary>Full markdown content of the page (used for FTS5 indexing).</summary>
    public string Content { get; set; } = string.Empty;

    /// <summary>Comma-separated tags from frontmatter.</summary>
    public string TagsRaw { get; set; } = string.Empty;

    /// <summary>Comma-separated [[backlink]] targets found in this page.</summary>
    public string BackLinksRaw { get; set; } = string.Empty;

    /// <summary>high | medium | low | contested</summary>
    public string Confidence { get; set; } = "medium";

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
