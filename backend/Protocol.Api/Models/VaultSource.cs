namespace Protocol.Api.Models;

/// <summary>Tracks a captured raw source document saved to the vault.</summary>
public class VaultSource
{
    public int Id { get; set; }
    public string Url { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;

    /// <summary>article | twitter | reddit | youtube | github | arxiv | pdf | note</summary>
    public string SourceType { get; set; } = "article";

    /// <summary>Relative path from vault root, e.g. raw/2026-04-17_karpathy-llm-wiki.md</summary>
    public string RawFilePath { get; set; } = string.Empty;

    /// <summary>Slug portion of filename, e.g. karpathy-llm-wiki</summary>
    public string Slug { get; set; } = string.Empty;

    public string? UserNote { get; set; }

    /// <summary>Comma-separated tags stored as a single string for SQLite compatibility.</summary>
    public string TagsRaw { get; set; } = string.Empty;

    /// <summary>captured | compiled | error</summary>
    public string Status { get; set; } = "captured";

    public DateTime CapturedAt { get; set; } = DateTime.UtcNow;
    public DateTime? CompiledAt { get; set; }
}
