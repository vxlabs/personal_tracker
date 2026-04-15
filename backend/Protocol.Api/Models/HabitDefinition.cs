namespace Protocol.Api.Models;

public class HabitDefinition
{
    public int Id { get; set; }
    public string Key { get; set; } = string.Empty;   // e.g. "active_recall"
    public string Label { get; set; } = string.Empty;
    public string Icon { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;

    // Bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
    // 0 = applies every day
    public int ApplicableDays { get; set; } = 0;

    public ICollection<HabitLog> Logs { get; set; } = new List<HabitLog>();
}
