namespace Protocol.Api.Models;

/// <summary>Idempotent XP grant identified by <see cref="SourceKey"/>.</summary>
public class XpLedgerEntry
{
    public int Id { get; set; }
    public DateTime CreatedAtUtc { get; set; }
    public int Amount { get; set; }
    public string SourceKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
}
