namespace Protocol.Api.Models;

public class TimeBlock
{
    public int Id { get; set; }
    public DayOfWeek DayOfWeek { get; set; }
    public TimeSpan StartTime { get; set; }
    public TimeSpan EndTime { get; set; }
    public string Type { get; set; } = string.Empty;  // football, gym, ml, content, reading, work, rest, off, routine, deep
    public string Label { get; set; } = string.Empty;
    public string? Note { get; set; }
    public bool IsFocusBlock { get; set; }
    public int SortOrder { get; set; }
}
