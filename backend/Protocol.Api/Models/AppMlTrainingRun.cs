namespace Protocol.Api.Models;

public class AppMlTrainingRun
{
    public int Id { get; set; }
    public DateTime StartedAtUtc { get; set; } = DateTime.UtcNow;
    public DateTime? CompletedAtUtc { get; set; }
    public bool Succeeded { get; set; }
    public string Message { get; set; } = string.Empty;
    public int TrainingExampleCount { get; set; }
    public string? ModelPath { get; set; }
}
