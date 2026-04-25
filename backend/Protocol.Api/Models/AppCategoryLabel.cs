namespace Protocol.Api.Models;

public class AppCategoryLabel
{
    public int Id { get; set; }
    public string ProcessName { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public DateTime UpdatedAtUtc { get; set; } = DateTime.UtcNow;
}
