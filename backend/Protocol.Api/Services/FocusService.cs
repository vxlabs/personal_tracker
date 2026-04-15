using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record FocusSessionDto(
    int Id,
    DateTime StartedAt,
    DateTime? EndedAt,
    string BlockType,
    string BlockLabel,
    int? DurationMinutes,
    bool IsActive
);

public record FocusCurrentResponse(
    FocusSessionDto? Session,
    int ElapsedSeconds
);

public record FocusStopResponse(FocusSessionDto Session, XpDeltaDto Xp);

public class FocusService(ProtocolDbContext db, XpService xpService)
{
    private static readonly TimeZoneInfo Ist = GetIst();

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }

    private static DateTime NowIst() =>
        TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);

    /// <summary>Starts a new focus session. Detects the current time block automatically.</summary>
    public async Task<FocusSessionDto> StartAsync()
    {
        // Prevent starting a second concurrent session
        var existing = await db.FocusSessions
            .FirstOrDefaultAsync(s => s.EndedAt == null);

        if (existing != null)
            throw new InvalidOperationException("A focus session is already active.");

        var now = NowIst();
        var todayDow = now.DayOfWeek;
        var currentTime = now.TimeOfDay;

        // Auto-detect the current schedule block
        var activeBlock = await db.TimeBlocks
            .Where(b => b.DayOfWeek == todayDow
                     && b.StartTime <= currentTime
                     && b.EndTime > currentTime)
            .OrderBy(b => b.SortOrder)
            .FirstOrDefaultAsync();

        var session = new FocusSession
        {
            StartedAt = DateTime.UtcNow,
            BlockType = activeBlock?.Type ?? "free",
            BlockLabel = activeBlock?.Label ?? "Free Time",
        };

        db.FocusSessions.Add(session);
        await db.SaveChangesAsync();

        return ToDto(session);
    }

    /// <summary>Stops the active focus session and records its duration.</summary>
    public async Task<FocusStopResponse> StopAsync()
    {
        var session = await db.FocusSessions
            .FirstOrDefaultAsync(s => s.EndedAt == null)
            ?? throw new KeyNotFoundException("No active focus session to stop.");

        var now = DateTime.UtcNow;
        session.EndedAt = now;
        session.DurationMinutes = (int)Math.Round((now - session.StartedAt).TotalMinutes);

        await db.SaveChangesAsync();
        var dto = ToDto(session);
        var xpDelta = await xpService.OnFocusSessionCompletedAsync(session.Id, session.DurationMinutes ?? 0);
        return new FocusStopResponse(dto, xpDelta);
    }

    /// <summary>Returns the active session (if any) plus computed elapsed seconds.</summary>
    public async Task<FocusCurrentResponse> GetCurrentAsync()
    {
        var session = await db.FocusSessions
            .FirstOrDefaultAsync(s => s.EndedAt == null);

        if (session == null)
            return new FocusCurrentResponse(null, 0);

        var elapsed = (int)(DateTime.UtcNow - session.StartedAt).TotalSeconds;
        return new FocusCurrentResponse(ToDto(session), elapsed);
    }

    /// <summary>Returns completed sessions ordered newest first.</summary>
    public async Task<List<FocusSessionDto>> GetHistoryAsync()
    {
        var sessions = await db.FocusSessions
            .Where(s => s.EndedAt != null)
            .OrderByDescending(s => s.StartedAt)
            .ToListAsync();

        return sessions.Select(ToDto).ToList();
    }

    private static FocusSessionDto ToDto(FocusSession s) => new(
        s.Id,
        s.StartedAt,
        s.EndedAt,
        s.BlockType,
        s.BlockLabel,
        s.DurationMinutes,
        s.EndedAt == null
    );
}
