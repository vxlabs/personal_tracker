using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record DailyReviewDto(
    int Id,
    string Date,
    string Entry1,
    string Entry2,
    string Entry3,
    DateTime CreatedAt
);

public record DailyReviewUpsertRequest(
    string Date,
    string Entry1,
    string Entry2,
    string Entry3
);

public record CalendarEntry(string Date, bool HasReview);

public record SearchResult(
    int Id,
    string Date,
    string MatchedEntry,
    int EntryNumber
);

public record ReviewSaveResponse(DailyReviewDto Review, XpDeltaDto Xp);

public class DailyReviewService(ProtocolDbContext db, XpService xp)
{
    public async Task<ReviewSaveResponse> UpsertAsync(DailyReviewUpsertRequest req)
    {
        if (!DateOnly.TryParse(req.Date, out var date))
            throw new ArgumentException($"Invalid date format: '{req.Date}'. Use yyyy-MM-dd.");

        var existing = await db.DailyReviews
            .FirstOrDefaultAsync(r => r.Date == date);

        if (existing != null)
        {
            existing.Entry1 = req.Entry1.Trim();
            existing.Entry2 = req.Entry2.Trim();
            existing.Entry3 = req.Entry3.Trim();
        }
        else
        {
            existing = new DailyReview
            {
                Date = date,
                Entry1 = req.Entry1.Trim(),
                Entry2 = req.Entry2.Trim(),
                Entry3 = req.Entry3.Trim(),
                CreatedAt = DateTime.UtcNow,
            };
            db.DailyReviews.Add(existing);
        }

        await db.SaveChangesAsync();
        var dto = ToDto(existing);
        var xpDelta = await xp.OnDailyReviewSavedAsync(date, dto.Entry1, dto.Entry2, dto.Entry3);
        return new ReviewSaveResponse(dto, xpDelta);
    }

    public async Task<DailyReviewDto?> GetByDateAsync(string dateStr)
    {
        if (!DateOnly.TryParse(dateStr, out var date))
            throw new ArgumentException($"Invalid date format: '{dateStr}'. Use yyyy-MM-dd.");

        var review = await db.DailyReviews
            .FirstOrDefaultAsync(r => r.Date == date);

        return review == null ? null : ToDto(review);
    }

    public async Task<List<CalendarEntry>> GetCalendarAsync(int year, int month)
    {
        var startDate = new DateOnly(year, month, 1);
        var endDate = startDate.AddMonths(1).AddDays(-1);

        var reviewDates = await db.DailyReviews
            .Where(r => r.Date >= startDate && r.Date <= endDate)
            .Select(r => r.Date)
            .ToListAsync();

        var reviewDateSet = reviewDates.ToHashSet();
        var entries = new List<CalendarEntry>();

        for (var d = startDate; d <= endDate; d = d.AddDays(1))
        {
            entries.Add(new CalendarEntry(d.ToString("yyyy-MM-dd"), reviewDateSet.Contains(d)));
        }

        return entries;
    }

    public async Task<List<SearchResult>> SearchAsync(string query)
    {
        if (string.IsNullOrWhiteSpace(query))
            return [];

        var q = query.Trim().ToLowerInvariant();

        var reviews = await db.DailyReviews
            .OrderByDescending(r => r.Date)
            .ToListAsync();

        var results = new List<SearchResult>();

        foreach (var r in reviews)
        {
            if (r.Entry1.Contains(q, StringComparison.OrdinalIgnoreCase))
                results.Add(new SearchResult(r.Id, r.Date.ToString("yyyy-MM-dd"), r.Entry1, 1));
            if (r.Entry2.Contains(q, StringComparison.OrdinalIgnoreCase))
                results.Add(new SearchResult(r.Id, r.Date.ToString("yyyy-MM-dd"), r.Entry2, 2));
            if (r.Entry3.Contains(q, StringComparison.OrdinalIgnoreCase))
                results.Add(new SearchResult(r.Id, r.Date.ToString("yyyy-MM-dd"), r.Entry3, 3));
        }

        return results;
    }

    private static DailyReviewDto ToDto(DailyReview r) => new(
        r.Id,
        r.Date.ToString("yyyy-MM-dd"),
        r.Entry1,
        r.Entry2,
        r.Entry3,
        r.CreatedAt
    );
}
