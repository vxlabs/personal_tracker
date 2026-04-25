using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record AppCategoryBucketDto(string Category, int TotalSeconds, double Percentage);
public record AppGroupDto(string ProcessName, string CategoryLabel, string LabelSource, int TotalSeconds, int SessionCount);
public record AppUsageSummaryDto(
    string Period,
    DateTime FromUtc,
    DateTime ToUtc,
    int TotalTrackedSeconds,
    List<AppCategoryBucketDto> Categories,
    List<AppGroupDto> Apps
);
public record AppLabelDto(int Id, string ProcessName, string Label, DateTime UpdatedAtUtc);
public record AppHeartbeatResult(bool IsNew, string SessionKey);

public class AppActivityService(ProtocolDbContext db, AppCategoryMlService ml, ILogger<AppActivityService> logger)
{
    private const int IdleThresholdSeconds = 120;

    private static readonly Dictionary<string, string> KnownApps = new(StringComparer.OrdinalIgnoreCase)
    {
        ["Code"] = "Coding",
        ["cursor"] = "Coding",
        ["devenv"] = "Coding",
        ["rider64"] = "Coding",
        ["idea64"] = "Coding",
        ["codex"] = "Coding",
        ["WindowsTerminal"] = "Coding",
        ["powershell"] = "Coding",
        ["pwsh"] = "Coding",
        ["cmd"] = "Coding",
        ["pycharm64"] = "Coding",
        ["webstorm64"] = "Coding",
        ["sublime_text"] = "Coding",
        ["notepad++"] = "Coding",
        ["wsl"] = "Coding",
        ["wslhost"] = "Coding",
        ["git"] = "Coding",
        ["conhost"] = "Coding",

        ["firefox"] = "Browsing",
        ["chrome"] = "Browsing",
        ["msedge"] = "Browsing",
        ["brave"] = "Browsing",
        ["opera"] = "Browsing",
        ["vivaldi"] = "Browsing",

        ["WhatsApp"] = "Communication",
        ["Telegram"] = "Communication",
        ["Slack"] = "Communication",
        ["Discord"] = "Communication",
        ["Teams"] = "Communication",
        ["zoom"] = "Communication",
        ["msteams"] = "Communication",
        ["thunderbird"] = "Communication",
        ["OUTLOOK"] = "Communication",
        ["Signal"] = "Communication",

        ["EXCEL"] = "Productivity",
        ["WINWORD"] = "Productivity",
        ["POWERPNT"] = "Productivity",
        ["Obsidian"] = "Productivity",
        ["Notion"] = "Productivity",
        ["notion"] = "Productivity",
        ["ONENOTE"] = "Productivity",
        ["acrobat"] = "Productivity",

        ["Spotify"] = "Entertainment",
        ["vlc"] = "Entertainment",
        ["mpv"] = "Entertainment",
        ["steam"] = "Entertainment",
        ["EpicGamesLauncher"] = "Entertainment",

        ["explorer"] = "System",
        ["Taskmgr"] = "System",
        ["SystemSettings"] = "System",
        ["regedit"] = "System",
        ["mmc"] = "System",
        ["dllhost"] = "System",
        ["svchost"] = "System",
        ["RuntimeBroker"] = "System",
    };

    public async Task<AppHeartbeatResult> HeartbeatAsync(
        string processName,
        string? windowTitle,
        DateTime observedAtUtc,
        CancellationToken ct = default)
    {
        var sessionKey = BuildSessionKey(processName, observedAtUtc);
        var existing = await db.AppUsageSessions
            .Where(s => s.ProcessName == processName && s.EndedAtUtc == null)
            .OrderByDescending(s => s.StartedAtUtc)
            .FirstOrDefaultAsync(ct);

        var isNew = false;

        if (existing is null)
        {
            var category = await ClassifyAsync(processName, windowTitle);
            existing = new AppUsageSession
            {
                SessionKey = sessionKey,
                ProcessName = processName,
                WindowTitle = windowTitle,
                StartedAtUtc = observedAtUtc,
                LastSeenAtUtc = observedAtUtc,
                ActiveSeconds = 5,
                CategoryLabel = category.Label,
                LabelSource = category.Source,
                PredictionConfidence = category.Confidence,
                PredictedAtUtc = category.Source == "ml" ? observedAtUtc : null,
                CreatedAtUtc = observedAtUtc
            };
            db.AppUsageSessions.Add(existing);
            isNew = true;
        }
        else
        {
            var gap = (observedAtUtc - existing.LastSeenAtUtc).TotalSeconds;
            if (gap <= IdleThresholdSeconds)
                existing.ActiveSeconds += (int)Math.Min(gap, 5);

            existing.LastSeenAtUtc = observedAtUtc;

            if (windowTitle is not null)
                existing.WindowTitle = windowTitle;
        }

        await db.SaveChangesAsync(ct);
        return new AppHeartbeatResult(isNew, existing.SessionKey);
    }

    public async Task FinalizeAsync(string processName, DateTime endedAtUtc, CancellationToken ct = default)
    {
        var sessions = await db.AppUsageSessions
            .Where(s => s.ProcessName == processName && s.EndedAtUtc == null)
            .ToListAsync(ct);

        foreach (var s in sessions)
            s.EndedAtUtc = endedAtUtc;

        await db.SaveChangesAsync(ct);
    }

    public async Task FinalizeAllAsync(DateTime endedAtUtc, CancellationToken ct = default)
    {
        var sessions = await db.AppUsageSessions
            .Where(s => s.EndedAtUtc == null)
            .ToListAsync(ct);

        foreach (var s in sessions)
            s.EndedAtUtc = endedAtUtc;

        await db.SaveChangesAsync(ct);
    }

    public async Task<AppUsageSummaryDto> GetSummaryAsync(string period = "today")
    {
        var (fromUtc, toUtc) = GetPeriodBounds(period);

        var sessions = await db.AppUsageSessions
            .Where(s => s.StartedAtUtc >= fromUtc && s.StartedAtUtc < toUtc && s.ActiveSeconds > 0)
            .ToListAsync();

        var totalSeconds = sessions.Sum(s => s.ActiveSeconds);

        var categories = sessions
            .GroupBy(s => s.CategoryLabel)
            .Select(g => new AppCategoryBucketDto(
                g.Key,
                g.Sum(s => s.ActiveSeconds),
                totalSeconds > 0 ? Math.Round(100.0 * g.Sum(s => s.ActiveSeconds) / totalSeconds, 1) : 0))
            .OrderByDescending(c => c.TotalSeconds)
            .ToList();

        var apps = sessions
            .GroupBy(s => new { s.ProcessName, s.CategoryLabel, s.LabelSource })
            .Select(g => new AppGroupDto(
                g.Key.ProcessName,
                g.Key.CategoryLabel,
                g.Key.LabelSource,
                g.Sum(s => s.ActiveSeconds),
                g.Count()))
            .OrderByDescending(a => a.TotalSeconds)
            .ToList();

        return new AppUsageSummaryDto(period, fromUtc, toUtc, totalSeconds, categories, apps);
    }

    public async Task<List<AppLabelDto>> GetLabelsAsync()
    {
        return await db.AppCategoryLabels
            .OrderBy(l => l.ProcessName)
            .Select(l => new AppLabelDto(l.Id, l.ProcessName, l.Label, l.UpdatedAtUtc))
            .ToListAsync();
    }

    public async Task<AppLabelDto> UpsertLabelAsync(string processName, string label)
    {
        processName = processName.Trim();
        label = label.Trim();

        var existing = await db.AppCategoryLabels
            .FirstOrDefaultAsync(l => l.ProcessName == processName);

        if (existing is null)
        {
            existing = new AppCategoryLabel
            {
                ProcessName = processName,
                Label = label,
                UpdatedAtUtc = DateTime.UtcNow
            };
            db.AppCategoryLabels.Add(existing);
        }
        else
        {
            existing.Label = label;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await db.SaveChangesAsync();

        // Re-classify open sessions for this process
        var openSessions = await db.AppUsageSessions
            .Where(s => s.ProcessName == processName && s.EndedAtUtc == null)
            .ToListAsync();

        foreach (var s in openSessions)
        {
            s.CategoryLabel = label;
            s.LabelSource = "manual";
        }

        await db.SaveChangesAsync();

        return new AppLabelDto(existing.Id, existing.ProcessName, existing.Label, existing.UpdatedAtUtc);
    }

    public async Task<int> ApplyPredictionsAsync()
    {
        var unclassified = await db.AppUsageSessions
            .Where(s => s.LabelSource == "unclassified" || s.LabelSource == "rule")
            .ToListAsync();

        var updated = 0;
        foreach (var s in unclassified)
        {
            var pred = ml.Predict(s.ProcessName, s.WindowTitle);
            if (pred is null) continue;

            s.CategoryLabel = pred.Label;
            s.LabelSource = "ml";
            s.PredictionConfidence = pred.Confidence;
            s.PredictedAtUtc = DateTime.UtcNow;
            updated++;
        }

        if (updated > 0)
            await db.SaveChangesAsync();

        logger.LogInformation("Re-applied ML predictions to {Count} app sessions", updated);
        return updated;
    }

    private async Task<(string Label, string Source, float? Confidence)> ClassifyAsync(
        string processName,
        string? windowTitle)
    {
        // 1. Manual label
        var manual = await db.AppCategoryLabels
            .FirstOrDefaultAsync(l => l.ProcessName == processName);
        if (manual is not null)
            return (manual.Label, "manual", null);

        // 2. Rule-based defaults
        if (KnownApps.TryGetValue(processName, out var ruleLabel))
            return (ruleLabel, "rule", null);

        // 3. ML model
        var pred = ml.Predict(processName, windowTitle);
        if (pred is not null)
            return (pred.Label, "ml", pred.Confidence);

        // 4. Unclassified
        return ("Uncategorized", "unclassified", null);
    }

    private static string BuildSessionKey(string processName, DateTime startedAt)
        => $"{processName}|{startedAt:yyyyMMddHHmmss}|{Guid.NewGuid():N}".ToLower();

    private static readonly TimeZoneInfo Ist = GetIst();

    private static (DateTime from, DateTime to) GetPeriodBounds(string period)
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        var startIst = period.ToLower() switch
        {
            "week" => nowIst.Date.AddDays(-6),
            "month" => new DateTime(nowIst.Year, nowIst.Month, 1),
            _ => nowIst.Date // today
        };
        var endIst = nowIst.Date.AddDays(1);

        return (
            TimeZoneInfo.ConvertTimeToUtc(startIst, Ist),
            TimeZoneInfo.ConvertTimeToUtc(endIst, Ist)
        );
    }

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }
}
