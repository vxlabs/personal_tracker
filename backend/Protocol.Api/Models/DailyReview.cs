namespace Protocol.Api.Models;

public class DailyReview
{
    public int Id { get; set; }
    public DateOnly Date { get; set; }
    public string Entry1 { get; set; } = string.Empty;
    public string Entry2 { get; set; } = string.Empty;
    public string Entry3 { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
