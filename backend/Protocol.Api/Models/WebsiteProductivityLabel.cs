namespace Protocol.Api.Models;

public class WebsiteProductivityLabel
{
    public int Id { get; set; }
    public string Scope { get; set; } = "url";
    public string Target { get; set; } = string.Empty;
    public string Domain { get; set; } = string.Empty;
    public string? Url { get; set; }
    public string Label { get; set; } = "Neutral";
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
