using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record BlockDto(
    int Id,
    string DayOfWeek,
    string StartTime,
    string EndTime,
    string Type,
    string Label,
    string? Note,
    bool IsFocusBlock,
    int SortOrder
);

public record NowResponse(
    BlockDto? CurrentBlock,
    BlockDto? NextBlock,
    int MinutesRemaining,
    double PercentComplete,
    string CurrentTimeIst
);

public record BlockInput(
    string StartTime,
    string EndTime,
    string Type,
    string Label,
    string? Note,
    bool IsFocusBlock
);

public record DuplicateDayRequest(string FromDay, string ToDay);

public class ScheduleService(ProtocolDbContext db)
{
    // IST = UTC+5:30. TimeZoneInfo ID differs by OS:
    // Windows: "India Standard Time", Linux/Mac: "Asia/Kolkata"
    private static readonly TimeZoneInfo Ist = GetIst();

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }

    public static DateTime NowIst() => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);

    public async Task<Dictionary<string, List<BlockDto>>> GetFullWeekAsync()
    {
        var blocks = await db.TimeBlocks
            .OrderBy(b => b.DayOfWeek)
            .ThenBy(b => b.SortOrder)
            .ToListAsync();

        return blocks
            .GroupBy(b => b.DayOfWeek.ToString().ToLower())
            .ToDictionary(g => g.Key, g => g.Select(ToDto).ToList());
    }

    public async Task<List<BlockDto>> GetDayAsync(DayOfWeek day)
    {
        var blocks = await db.TimeBlocks
            .Where(b => b.DayOfWeek == day)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        return blocks.Select(ToDto).ToList();
    }

    public async Task<NowResponse> GetNowAsync()
    {
        var now = NowIst();
        var todayDow = now.DayOfWeek;
        var currentTime = now.TimeOfDay;

        var todayBlocks = await db.TimeBlocks
            .Where(b => b.DayOfWeek == todayDow)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        TimeBlock? current = null;
        TimeBlock? next = null;

        for (int i = 0; i < todayBlocks.Count; i++)
        {
            var block = todayBlocks[i];

            // Handle blocks that cross midnight (e.g. 22:30–23:15 is fine; 23:00–01:00 would need special handling)
            bool isActive = currentTime >= block.StartTime && currentTime < block.EndTime;

            if (isActive)
            {
                current = block;
                next = i + 1 < todayBlocks.Count ? todayBlocks[i + 1] : null;

                // If no next today, peek at tomorrow's first block
                if (next == null)
                {
                    var tomorrow = (DayOfWeek)(((int)todayDow + 1) % 7);
                    next = await db.TimeBlocks
                        .Where(b => b.DayOfWeek == tomorrow)
                        .OrderBy(b => b.SortOrder)
                        .FirstOrDefaultAsync();
                }
                break;
            }

            // If we haven't found current yet and this block starts in the future, it's "next"
            if (current == null && block.StartTime > currentTime && next == null)
            {
                next = block;
            }
        }

        int minutesRemaining = 0;
        double percentComplete = 0;

        if (current != null)
        {
            var totalMinutes = (current.EndTime - current.StartTime).TotalMinutes;
            var elapsedMinutes = (currentTime - current.StartTime).TotalMinutes;
            minutesRemaining = (int)Math.Ceiling(current.EndTime.TotalMinutes - currentTime.TotalMinutes);
            percentComplete = totalMinutes > 0 ? Math.Round(elapsedMinutes / totalMinutes * 100, 1) : 0;
        }

        return new NowResponse(
            current != null ? ToDto(current) : null,
            next != null ? ToDto(next) : null,
            minutesRemaining,
            percentComplete,
            now.ToString("HH:mm:ss")
        );
    }

    private static readonly string[] ValidTypes =
        ["football", "gym", "ml", "content", "reading", "work", "rest", "off", "routine", "deep"];

    public async Task<List<BlockDto>> UpdateDayAsync(DayOfWeek day, List<BlockInput> blocks)
    {
        var errors = ValidateBlocks(blocks);
        if (errors.Count > 0)
            throw new ArgumentException(string.Join("; ", errors));

        var existing = await db.TimeBlocks
            .Where(b => b.DayOfWeek == day)
            .ToListAsync();

        db.TimeBlocks.RemoveRange(existing);

        var newBlocks = blocks.Select((b, i) => new TimeBlock
        {
            DayOfWeek = day,
            StartTime = TimeSpan.Parse(b.StartTime),
            EndTime = TimeSpan.Parse(b.EndTime),
            Type = b.Type,
            Label = b.Label,
            Note = b.Note,
            IsFocusBlock = b.IsFocusBlock,
            SortOrder = i
        }).ToList();

        db.TimeBlocks.AddRange(newBlocks);
        await db.SaveChangesAsync();

        return newBlocks.Select(ToDto).ToList();
    }

    public async Task<List<BlockDto>> DuplicateDayAsync(DayOfWeek from, DayOfWeek to)
    {
        var sourceBlocks = await db.TimeBlocks
            .Where(b => b.DayOfWeek == from)
            .OrderBy(b => b.SortOrder)
            .ToListAsync();

        if (sourceBlocks.Count == 0)
            throw new KeyNotFoundException($"No blocks found for {from}");

        var existingTarget = await db.TimeBlocks
            .Where(b => b.DayOfWeek == to)
            .ToListAsync();

        db.TimeBlocks.RemoveRange(existingTarget);

        var newBlocks = sourceBlocks.Select((b, i) => new TimeBlock
        {
            DayOfWeek = to,
            StartTime = b.StartTime,
            EndTime = b.EndTime,
            Type = b.Type,
            Label = b.Label,
            Note = b.Note,
            IsFocusBlock = b.IsFocusBlock,
            SortOrder = i
        }).ToList();

        db.TimeBlocks.AddRange(newBlocks);
        await db.SaveChangesAsync();

        return newBlocks.Select(ToDto).ToList();
    }

    private static List<string> ValidateBlocks(List<BlockInput> blocks)
    {
        var errors = new List<string>();

        for (int i = 0; i < blocks.Count; i++)
        {
            var b = blocks[i];

            if (!TimeSpan.TryParse(b.StartTime, out var start))
            {
                errors.Add($"Block {i}: invalid start time '{b.StartTime}'");
                continue;
            }
            if (!TimeSpan.TryParse(b.EndTime, out var end))
            {
                errors.Add($"Block {i}: invalid end time '{b.EndTime}'");
                continue;
            }

            if (start >= end)
                errors.Add($"Block {i}: start ({b.StartTime}) must be before end ({b.EndTime})");

            if (string.IsNullOrWhiteSpace(b.Label))
                errors.Add($"Block {i}: label is required");

            if (!ValidTypes.Contains(b.Type))
                errors.Add($"Block {i}: invalid type '{b.Type}'. Valid: {string.Join(", ", ValidTypes)}");
        }

        var parsed = blocks
            .Where(b => TimeSpan.TryParse(b.StartTime, out _) && TimeSpan.TryParse(b.EndTime, out _))
            .Select(b => (Start: TimeSpan.Parse(b.StartTime), End: TimeSpan.Parse(b.EndTime)))
            .OrderBy(b => b.Start)
            .ToList();

        for (int i = 1; i < parsed.Count; i++)
        {
            if (parsed[i].Start < parsed[i - 1].End)
                errors.Add($"Blocks overlap: {parsed[i - 1].End:hh\\:mm} and {parsed[i].Start:hh\\:mm}");
        }

        return errors;
    }

    private static BlockDto ToDto(TimeBlock b) => new(
        b.Id,
        b.DayOfWeek.ToString(),
        b.StartTime.ToString(@"hh\:mm"),
        b.EndTime.ToString(@"hh\:mm"),
        b.Type,
        b.Label,
        b.Note,
        b.IsFocusBlock,
        b.SortOrder
    );
}
