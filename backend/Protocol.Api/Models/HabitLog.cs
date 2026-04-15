namespace Protocol.Api.Models;

public class HabitLog
{
    public int Id { get; set; }
    public int HabitDefinitionId { get; set; }
    public HabitDefinition HabitDefinition { get; set; } = null!;
    public DateOnly Date { get; set; }
    public bool IsCompleted { get; set; }
    public DateTime? CompletedAt { get; set; }
}
