namespace Protocol.Api.Models;

public class BlockedAttempt
{
    public int Id { get; set; }
    public string Domain { get; set; } = string.Empty;
    public DateTime BlockedAt { get; set; } = DateTime.UtcNow;
    public string? BlockLabel { get; set; }
    public string? BlockType { get; set; }
}
