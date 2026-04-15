using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;

namespace Protocol.Api.Services;

public class NotificationBackgroundService(
    IServiceScopeFactory scopeFactory,
    ILogger<NotificationBackgroundService> logger) : BackgroundService
{
    private static readonly TimeZoneInfo Ist = GetIst();
    private readonly HashSet<string> _sentToday = new();
    private DateOnly _lastResetDate = DateOnly.MinValue;

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Notification background service started");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await CheckAndSendNotifications(stoppingToken);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error in notification background service");
            }

            await Task.Delay(TimeSpan.FromSeconds(30), stoppingToken);
        }
    }

    private async Task CheckAndSendNotifications(CancellationToken ct)
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        var todayIst = DateOnly.FromDateTime(nowIst);
        var currentTime = nowIst.TimeOfDay;

        if (_lastResetDate != todayIst)
        {
            _sentToday.Clear();
            _lastResetDate = todayIst;
        }

        using var scope = scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<ProtocolDbContext>();
        var notificationService = scope.ServiceProvider.GetRequiredService<NotificationService>();

        var prefs = await notificationService.GetPreferencesAsync();
        var hasSubscribers = await db.PushSubscriptions.AnyAsync(ct);
        if (!hasSubscribers) return;

        if (prefs.BlockTransition)
            await CheckBlockTransitions(db, notificationService, nowIst, currentTime);

        if (prefs.HabitReminder)
            await CheckFixedTimeNotification(notificationService, currentTime,
                new TimeSpan(13, 30, 0), "habit-reminder",
                "Habit Check", "Did you do your lunch walk?");

        if (prefs.DailyReview)
            await CheckFixedTimeNotification(notificationService, currentTime,
                new TimeSpan(22, 30, 0), "daily-review",
                "Daily Review", "What 3 things did you learn today?");

        if (prefs.SleepWarning)
            await CheckFixedTimeNotification(notificationService, currentTime,
                new TimeSpan(22, 45, 0), "sleep-warning",
                "Sleep Warning", "30 min to lights out — start winding down");
    }

    private async Task CheckBlockTransitions(
        ProtocolDbContext db,
        NotificationService notificationService,
        DateTime nowIst,
        TimeSpan currentTime)
    {
        var todayDow = nowIst.DayOfWeek;
        var blocks = await db.TimeBlocks
            .Where(b => b.DayOfWeek == todayDow)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        foreach (var block in blocks)
        {
            var warnTime = block.StartTime - TimeSpan.FromMinutes(5);
            if (warnTime < TimeSpan.Zero) continue;

            var key = $"block-{block.Id}-{_lastResetDate}";
            if (_sentToday.Contains(key)) continue;

            if (currentTime >= warnTime && currentTime < block.StartTime)
            {
                var startStr = block.StartTime.ToString(@"hh\:mm");
                await notificationService.SendToAllAsync(
                    "Block Starting",
                    $"{block.Label} starts in 5 min ({startStr})",
                    "block-transition");
                _sentToday.Add(key);
            }
        }
    }

    private async Task CheckFixedTimeNotification(
        NotificationService notificationService,
        TimeSpan currentTime,
        TimeSpan targetTime,
        string key,
        string title,
        string body)
    {
        var dailyKey = $"{key}-{_lastResetDate}";
        if (_sentToday.Contains(dailyKey)) return;

        var window = TimeSpan.FromMinutes(1);
        if (currentTime >= targetTime && currentTime < targetTime + window)
        {
            await notificationService.SendToAllAsync(title, body, key);
            _sentToday.Add(dailyKey);
        }
    }
}
