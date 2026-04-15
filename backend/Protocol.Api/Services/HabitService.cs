using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record HabitStatusDto(
    int HabitId,
    string Key,
    string Label,
    string Icon,
    bool IsApplicableToday,
    bool IsCompletedToday,
    int CurrentStreak,
    int LongestStreak
);

public record HabitActionResponse(HabitStatusDto Habit, XpDeltaDto Xp);

public class HabitService(ProtocolDbContext db, XpService xp)
{
    private static readonly TimeZoneInfo Ist = GetIst();

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }

    private static DateOnly TodayIst()
    {
        var now = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        return DateOnly.FromDateTime(now);
    }

    public async Task<List<HabitStatusDto>> GetTodayAsync()
    {
        var today = TodayIst();
        var habits = await db.HabitDefinitions
            .Where(h => h.IsActive)
            .OrderBy(h => h.Id)
            .ToListAsync();

        // Load all logs in bulk, grouped by date
        var habitIds = habits.Select(h => h.Id).ToList();
        var allLogs = await db.HabitLogs
            .Where(l => habitIds.Contains(l.HabitDefinitionId))
            .ToListAsync();

        var logsByHabitAndDate = allLogs
            .GroupBy(l => l.HabitDefinitionId)
            .ToDictionary(
                g => g.Key,
                g => g.ToLookup(l => l.Date));

        return habits.Select(habit =>
        {
            var logs = logsByHabitAndDate.TryGetValue(habit.Id, out var l)
                ? l
                : Enumerable.Empty<HabitLog>().ToLookup(x => x.Date);

            var todayLog = logs[today].FirstOrDefault();
            var isApplicableToday = StreakCalculator.IsApplicable(habit, today.DayOfWeek);
            var isCompletedToday = todayLog?.IsCompleted ?? false;

            var (currentStreak, longestStreak) = StreakCalculator.Calculate(habit, logs, today);

            return new HabitStatusDto(
                habit.Id,
                habit.Key,
                habit.Label,
                habit.Icon,
                isApplicableToday,
                isCompletedToday,
                currentStreak,
                longestStreak
            );
        }).ToList();
    }

    public async Task<List<HabitStatusDto>> GetStreaksAsync()
    {
        // Same shape as GetTodayAsync — reuse it
        return await GetTodayAsync();
    }

    public async Task<HabitActionResponse> CheckAsync(int habitId)
    {
        var today = TodayIst();
        var habit = await db.HabitDefinitions.FindAsync(habitId)
            ?? throw new KeyNotFoundException($"Habit {habitId} not found");

        var log = await db.HabitLogs
            .FirstOrDefaultAsync(l => l.HabitDefinitionId == habitId && l.Date == today);

        if (log == null)
        {
            log = new HabitLog
            {
                HabitDefinitionId = habitId,
                Date = today,
                IsCompleted = true,
                CompletedAt = DateTime.UtcNow
            };
            db.HabitLogs.Add(log);
        }
        else
        {
            log.IsCompleted = true;
            log.CompletedAt = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();
        var status = await GetSingleStatusAsync(habit, today);
        var xpDelta = await xp.OnHabitCheckedAsync(habitId);
        return new HabitActionResponse(status, xpDelta);
    }

    public async Task<HabitActionResponse> UncheckAsync(int habitId)
    {
        var today = TodayIst();
        var habit = await db.HabitDefinitions.FindAsync(habitId)
            ?? throw new KeyNotFoundException($"Habit {habitId} not found");

        var log = await db.HabitLogs
            .FirstOrDefaultAsync(l => l.HabitDefinitionId == habitId && l.Date == today);

        if (log != null)
        {
            log.IsCompleted = false;
            log.CompletedAt = null;
            await db.SaveChangesAsync();
        }

        var status = await GetSingleStatusAsync(habit, today);
        var xpDelta = await xp.OnHabitUncheckedAsync(habitId);
        return new HabitActionResponse(status, xpDelta);
    }

    private async Task<HabitStatusDto> GetSingleStatusAsync(HabitDefinition habit, DateOnly today)
    {
        var allLogs = await db.HabitLogs
            .Where(l => l.HabitDefinitionId == habit.Id)
            .ToListAsync();

        var logsByDate = allLogs.ToLookup(l => l.Date);

        var todayLog = logsByDate[today].FirstOrDefault();
        var (currentStreak, longestStreak) = StreakCalculator.Calculate(habit, logsByDate, today);

        return new HabitStatusDto(
            habit.Id,
            habit.Key,
            habit.Label,
            habit.Icon,
            StreakCalculator.IsApplicable(habit, today.DayOfWeek),
            todayLog?.IsCompleted ?? false,
            currentStreak,
            longestStreak
        );
    }
}
