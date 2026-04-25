namespace Protocol.Api.Models;

public class WebsiteVisitSession
{
    public int Id { get; set; }
    public string SessionKey { get; set; } = string.Empty;
    public string Url { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? Title { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime LastSeenAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? EndedAtUtc { get; set; }
    public int ActiveSeconds { get; set; }
    public string? SourceBrowser { get; set; }
    public string ProductivityLabel { get; set; } = "Unclassified";
    public string LabelSource { get; set; } = "unclassified";
    public float? PredictionConfidence { get; set; }
    public DateTime? PredictedAtUtc { get; set; }
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
}
