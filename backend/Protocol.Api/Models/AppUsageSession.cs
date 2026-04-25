namespace Protocol.Api.Models;

public class AppUsageSession
{
    public int Id { get; set; }
    public string SessionKey { get; set; } = string.Empty;
    public string ProcessName { get; set; } = string.Empty;
    public string? WindowTitle { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAtUtc { get; set; }
    public int ActiveSeconds { get; set; }
    public string CategoryLabel { get; set; } = "Uncategorized";
    public string LabelSource { get; set; } = "unclassified";
    public float? PredictionConfidence { get; set; }
    public DateTime? PredictedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
