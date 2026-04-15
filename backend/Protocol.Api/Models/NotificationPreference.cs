namespace Protocol.Api.Models;

public class NotificationPreference
{
    public int Id { get; set; }
    public bool BlockTransition { get; set; } = true;
    public bool HabitReminder { get; set; } = true;
    public bool SleepWarning { get; set; } = true;
    public bool DailyReview { get; set; } = true;
}
