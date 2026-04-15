namespace Protocol.Api.Models;

public class FocusSession
{
    public int Id { get; set; }
    public DateTime StartedAt { get; set; }
    public DateTime? EndedAt { get; set; }
    public string BlockType { get; set; } = string.Empty;
    public string BlockLabel { get; set; } = string.Empty;
    public int? DurationMinutes { get; set; }
}
