using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record XpDeltaDto(
    int TotalXp,
    string RankTitle,
    string? PreviousRankTitle,
    bool RankUp,
    int XpGainedThisAction
);

public record XpWeekBarDto(string Week, int TotalXp);

public record XpSummaryDto(
    int TotalXp,
    string RankTitle,
    string? NextRankTitle,
    int? XpToNextRank,
    List<XpWeekBarDto> WeeklyBars
);

public class XpService(ProtocolDbContext db)
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

    private static readonly (string Name, int MinXp)[] Ranks =
    [
        ("Recruit", 0),
        ("Soldier", 500),
        ("Sergeant", 1500),
        ("Lieutenant", 3000),
        ("Captain", 5000),
        ("Commander", 8000),
        ("General", 12000),
    ];

    private static int RankOrder(string title)
    {
        for (var i = 0; i < Ranks.Length; i++)
        {
            if (Ranks[i].Name == title) return i;
        }
        return 0;
    }

    public async Task<int> GetTotalXpAsync()
    {
        return await db.XpLedgerEntries.SumAsync(e => (int?)e.Amount) ?? 0;
    }

    public static string RankTitleForXp(int totalXp)
    {
        for (int i = Ranks.Length - 1; i >= 0; i--)
        {
            if (totalXp >= Ranks[i].MinXp)
                return Ranks[i].Name;
        }
        return Ranks[0].Name;
    }

    private static (string? NextTitle, int? XpToNext) NextRankInfo(int totalXp)
    {
        for (int i = 0; i < Ranks.Length; i++)
        {
            if (totalXp < Ranks[i].MinXp)
                return (Ranks[i].Name, Ranks[i].MinXp - totalXp);
        }
        return (null, null);
    }

    /// <summary>Award XP for completing a habit check (and related bonuses).</summary>
    public async Task<XpDeltaDto> OnHabitCheckedAsync(int habitId)
    {
        var today = TodayIst();
        var totalBefore = await GetTotalXpAsync();
        var rankBefore = RankTitleForXp(totalBefore);

        int gained = 0;
        gained += await TryAwardAsync($"habit:{habitId}:{today:yyyy-MM-dd}", 10, "Habit completed") ?? 0;

        if (await IsPerfectDayAsync(today))
            gained += await TryAwardAsync($"perfect:{today:yyyy-MM-dd}", 50, "Perfect day") ?? 0;

        var habit = await db.HabitDefinitions.FindAsync(habitId)
            ?? throw new KeyNotFoundException($"Habit {habitId} not found");

        var allLogs = await db.HabitLogs.Where(l => l.HabitDefinitionId == habit.Id).ToListAsync();
        var logsByDate = allLogs.ToLookup(l => l.Date);
        var (currentStreak, _) = StreakCalculator.Calculate(habit, logsByDate, today);

        if (currentStreak == 7)
            gained += await TryAwardAsync($"streak:{habitId}:7", 100, "7-day streak") ?? 0;
        if (currentStreak == 14)
            gained += await TryAwardAsync($"streak:{habitId}:14", 200, "14-day streak") ?? 0;
        if (currentStreak == 30)
            gained += await TryAwardAsync($"streak:{habitId}:30", 500, "30-day streak") ?? 0;

        return await BuildDeltaAsync(rankBefore, gained);
    }

    /// <summary>Remove habit XP and perfect-day bonus if no longer earned.</summary>
    public async Task<XpDeltaDto> OnHabitUncheckedAsync(int habitId)
    {
        var today = TodayIst();
        var totalBefore = await GetTotalXpAsync();
        var rankBefore = RankTitleForXp(totalBefore);

        await RemoveEntryAsync($"habit:{habitId}:{today:yyyy-MM-dd}");

        if (!await IsPerfectDayAsync(today))
            await RemoveEntryAsync($"perfect:{today:yyyy-MM-dd}");

        var totalAfter = await GetTotalXpAsync();
        var gained = totalAfter - totalBefore;
        var rankAfter = RankTitleForXp(totalAfter);
        return new XpDeltaDto(
            totalAfter,
            rankAfter,
            rankBefore,
            RankOrder(rankAfter) > RankOrder(rankBefore),
            gained
        );
    }

    /// <summary>+5 XP per full 30 minutes of a completed focus session.</summary>
    public async Task<XpDeltaDto> OnFocusSessionCompletedAsync(int sessionId, int durationMinutes)
    {
        var totalBefore = await GetTotalXpAsync();
        var rankBefore = RankTitleForXp(totalBefore);

        var chunks = durationMinutes / 30;
        var amount = chunks * 5;
        int gained = 0;
        if (amount > 0)
            gained += await TryAwardAsync($"focus:{sessionId}", amount, "Focus session") ?? 0;

        return await BuildDeltaAsync(rankBefore, gained);
    }

    /// <summary>Award XP when a daily review has at least one non-empty entry.</summary>
    public async Task<XpDeltaDto> OnDailyReviewSavedAsync(DateOnly date, string e1, string e2, string e3)
    {
        var totalBefore = await GetTotalXpAsync();
        var rankBefore = RankTitleForXp(totalBefore);

        var hasContent = !string.IsNullOrWhiteSpace(e1)
            || !string.IsNullOrWhiteSpace(e2)
            || !string.IsNullOrWhiteSpace(e3);

        int gained = 0;
        if (hasContent)
            gained += await TryAwardAsync($"review:{date:yyyy-MM-dd}", 20, "Daily review") ?? 0;

        return await BuildDeltaAsync(rankBefore, gained);
    }

    public async Task<XpSummaryDto> GetSummaryAsync()
    {
        var total = await GetTotalXpAsync();
        var rank = RankTitleForXp(total);
        var (nextTitle, toNext) = NextRankInfo(total);

        var weekly = await GetWeeklyBarsAsync(8);

        return new XpSummaryDto(
            total,
            rank,
            nextTitle,
            toNext,
            weekly
        );
    }

    private async Task<List<XpWeekBarDto>> GetWeeklyBarsAsync(int weekCount)
    {
        var entries = await db.XpLedgerEntries.ToListAsync();
        var byWeek = new Dictionary<string, int>();

        foreach (var e in entries)
        {
            var key = IsoWeekKeyFromUtc(e.CreatedAtUtc);
            byWeek[key] = byWeek.GetValueOrDefault(key) + e.Amount;
        }

        var todayIst = TodayIst().ToDateTime(TimeOnly.MinValue);
        var year = ISOWeek.GetYear(todayIst);
        var w = ISOWeek.GetWeekOfYear(todayIst);

        var result = new List<XpWeekBarDto>();
        for (int i = weekCount - 1; i >= 0; i--)
        {
            var (yy, ww) = AddIsoWeeks(year, w, -i);
            var key = $"{yy}-W{ww:D2}";
            result.Add(new XpWeekBarDto(key, byWeek.GetValueOrDefault(key)));
        }

        return result;
    }

    private static (int Year, int Week) AddIsoWeeks(int year, int week, int delta)
    {
        var monday = ISOWeek.ToDateTime(year, week, DayOfWeek.Monday);
        var shifted = monday.AddDays(delta * 7);
        var ny = ISOWeek.GetYear(shifted);
        var nw = ISOWeek.GetWeekOfYear(shifted);
        return (ny, nw);
    }

    private static string IsoWeekKeyFromUtc(DateTime utc)
    {
        var ist = TimeZoneInfo.ConvertTimeFromUtc(utc, Ist);
        var dt = DateTime.SpecifyKind(ist, DateTimeKind.Unspecified);
        var y = ISOWeek.GetYear(dt);
        var w = ISOWeek.GetWeekOfYear(dt);
        return $"{y}-W{w:D2}";
    }

    private async Task<bool> IsPerfectDayAsync(DateOnly date)
    {
        var habits = await db.HabitDefinitions.Where(h => h.IsActive).ToListAsync();
        if (habits.Count == 0) return false;

        var anyApplicable = false;
        foreach (var h in habits)
        {
            if (!StreakCalculator.IsApplicable(h, date.DayOfWeek))
                continue;

            anyApplicable = true;
            var done = await db.HabitLogs
                .AnyAsync(l => l.HabitDefinitionId == h.Id && l.Date == date && l.IsCompleted);
            if (!done) return false;
        }

        return anyApplicable;
    }

    private async Task<int?> TryAwardAsync(string sourceKey, int amount, string label)
    {
        if (amount <= 0) return null;
        if (await db.XpLedgerEntries.AnyAsync(e => e.SourceKey == sourceKey))
            return null;

        db.XpLedgerEntries.Add(new XpLedgerEntry
        {
            CreatedAtUtc = DateTime.UtcNow,
            Amount = amount,
            SourceKey = sourceKey,
            Label = label,
        });
        await db.SaveChangesAsync();
        return amount;
    }

    private async Task RemoveEntryAsync(string sourceKey)
    {
        var row = await db.XpLedgerEntries.FirstOrDefaultAsync(e => e.SourceKey == sourceKey);
        if (row == null) return;
        db.XpLedgerEntries.Remove(row);
        await db.SaveChangesAsync();
    }

    private async Task<XpDeltaDto> BuildDeltaAsync(string rankBefore, int gained)
    {
        var totalAfter = await GetTotalXpAsync();
        var rankAfter = RankTitleForXp(totalAfter);
        return new XpDeltaDto(
            totalAfter,
            rankAfter,
            rankBefore,
            RankOrder(rankAfter) > RankOrder(rankBefore),
            gained
        );
    }
}
