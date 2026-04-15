using System.Globalization;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;

namespace Protocol.Api.Services;

public record WeeklyReportDto(
    string Week,
    string StartDate,
    string EndDate,
    List<HabitComplianceDto> HabitCompliance,
    FocusBreakdownDto FocusBreakdown,
    List<WeekDailyReviewDto?> DailyReviews,
    int Score
);

public record HabitComplianceDto(
    int HabitId,
    string Label,
    string Icon,
    int ApplicableDays,
    int CompletedDays,
    double CompliancePercent,
    int CurrentStreak,
    int LongestStreak
);

public record FocusBreakdownDto(
    double TotalHours,
    List<FocusTypeEntry> ByType
);

public record FocusTypeEntry(string BlockType, double Hours);

public record WeekDailyReviewDto(
    string Date,
    string DayName,
    string Entry1,
    string Entry2,
    string Entry3
);

public class WeeklyReportService(ProtocolDbContext db)
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

    /// <summary>
    /// Parse ISO week string like "2026-W16" to the Monday of that week.
    /// </summary>
    private static DateOnly ParseIsoWeek(string weekStr)
    {
        var parts = weekStr.Split("-W", StringSplitOptions.RemoveEmptyEntries);
        if (parts.Length != 2
            || !int.TryParse(parts[0], out var year)
            || !int.TryParse(parts[1], out var week)
            || week < 1 || week > 53)
        {
            throw new ArgumentException($"Invalid ISO week format: '{weekStr}'. Expected yyyy-Www (e.g., 2026-W16).");
        }

        var monday = ISOWeek.ToDateTime(year, week, DayOfWeek.Monday);
        return DateOnly.FromDateTime(monday);
    }

    /// <summary>
    /// Get the current ISO week string for today in IST.
    /// </summary>
    public static string CurrentWeekIso()
    {
        var today = TodayIst().ToDateTime(TimeOnly.MinValue);
        var year = ISOWeek.GetYear(today);
        var week = ISOWeek.GetWeekOfYear(today);
        return $"{year}-W{week:D2}";
    }

    public async Task<WeeklyReportDto> GetWeeklyAsync(string weekStr)
    {
        var monday = ParseIsoWeek(weekStr);
        var sunday = monday.AddDays(6);

        var habitCompliance = await GetHabitComplianceAsync(monday, sunday);
        var focusBreakdown = await GetFocusBreakdownAsync(monday, sunday);
        var dailyReviews = await GetDailyReviewsAsync(monday, sunday);
        var score = CalculateScore(habitCompliance, focusBreakdown, dailyReviews);

        return new WeeklyReportDto(
            weekStr,
            monday.ToString("yyyy-MM-dd"),
            sunday.ToString("yyyy-MM-dd"),
            habitCompliance,
            focusBreakdown,
            dailyReviews,
            score
        );
    }

    private async Task<List<HabitComplianceDto>> GetHabitComplianceAsync(DateOnly monday, DateOnly sunday)
    {
        var today = TodayIst();
        var habits = await db.HabitDefinitions
            .Where(h => h.IsActive)
            .OrderBy(h => h.Id)
            .ToListAsync();

        var habitIds = habits.Select(h => h.Id).ToList();
        var logs = await db.HabitLogs
            .Where(l => habitIds.Contains(l.HabitDefinitionId)
                     && l.Date >= monday
                     && l.Date <= sunday)
            .ToListAsync();

        var allLogs = await db.HabitLogs
            .Where(l => habitIds.Contains(l.HabitDefinitionId))
            .ToListAsync();

        var allLogsByHabit = allLogs
            .GroupBy(l => l.HabitDefinitionId)
            .ToDictionary(
                g => g.Key,
                g => g.ToLookup(l => l.Date));

        var logsByHabit = logs
            .GroupBy(l => l.HabitDefinitionId)
            .ToDictionary(g => g.Key, g => g.ToList());

        return habits.Select(h =>
        {
            int applicable = 0;
            int completed = 0;

            for (var d = monday; d <= sunday; d = d.AddDays(1))
            {
                if (d > today) break;
                if (!StreakCalculator.IsApplicable(h, d.DayOfWeek)) continue;
                applicable++;

                if (logsByHabit.TryGetValue(h.Id, out var hLogs)
                    && hLogs.Any(l => l.Date == d && l.IsCompleted))
                {
                    completed++;
                }
            }

            var logsLookup = allLogsByHabit.TryGetValue(h.Id, out var lookup)
                ? lookup
                : Enumerable.Empty<Models.HabitLog>().ToLookup(x => x.Date);

            var (currentStreak, longestStreak) = StreakCalculator.Calculate(h, logsLookup, today);

            var pct = applicable > 0 ? Math.Round((double)completed / applicable * 100, 1) : 0;

            return new HabitComplianceDto(h.Id, h.Label, h.Icon, applicable, completed, pct, currentStreak, longestStreak);
        }).ToList();
    }

    private async Task<FocusBreakdownDto> GetFocusBreakdownAsync(DateOnly monday, DateOnly sunday)
    {
        var startUtc = monday.ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        startUtc = TimeZoneInfo.ConvertTimeToUtc(startUtc, Ist);

        var endUtc = sunday.AddDays(1).ToDateTime(TimeOnly.MinValue, DateTimeKind.Unspecified);
        endUtc = TimeZoneInfo.ConvertTimeToUtc(endUtc, Ist);

        var sessions = await db.FocusSessions
            .Where(s => s.EndedAt != null
                     && s.StartedAt >= startUtc
                     && s.StartedAt < endUtc)
            .ToListAsync();

        var totalMinutes = sessions.Sum(s => s.DurationMinutes ?? 0);
        var byType = sessions
            .GroupBy(s => s.BlockType)
            .Select(g => new FocusTypeEntry(g.Key, Math.Round(g.Sum(s => s.DurationMinutes ?? 0) / 60.0, 1)))
            .OrderByDescending(e => e.Hours)
            .ToList();

        return new FocusBreakdownDto(Math.Round(totalMinutes / 60.0, 1), byType);
    }

    private async Task<List<WeekDailyReviewDto?>> GetDailyReviewsAsync(DateOnly monday, DateOnly sunday)
    {
        var reviews = await db.DailyReviews
            .Where(r => r.Date >= monday && r.Date <= sunday)
            .OrderBy(r => r.Date)
            .ToListAsync();

        var reviewDict = reviews.ToDictionary(r => r.Date);
        var result = new List<WeekDailyReviewDto?>();

        for (var d = monday; d <= sunday; d = d.AddDays(1))
        {
            if (reviewDict.TryGetValue(d, out var r))
            {
                result.Add(new WeekDailyReviewDto(
                    d.ToString("yyyy-MM-dd"),
                    d.DayOfWeek.ToString(),
                    r.Entry1,
                    r.Entry2,
                    r.Entry3
                ));
            }
            else
            {
                result.Add(null);
            }
        }

        return result;
    }

    private static int CalculateScore(
        List<HabitComplianceDto> habits,
        FocusBreakdownDto focus,
        List<WeekDailyReviewDto?> reviews)
    {
        // Habit compliance: 60% weight
        double avgCompliance = habits.Count > 0
            ? habits.Average(h => h.CompliancePercent)
            : 0;
        double habitScore = avgCompliance * 0.6;

        // Focus hours: 25% weight (target ~20 hours/week)
        const double focusTarget = 20.0;
        double focusRatio = Math.Min(focus.TotalHours / focusTarget, 1.0);
        double focusScore = focusRatio * 25;

        // Daily review completion: 15% weight
        int reviewsDone = reviews.Count(r => r != null);
        double reviewScore = (reviewsDone / 7.0) * 15;

        return (int)Math.Round(habitScore + focusScore + reviewScore);
    }
}
