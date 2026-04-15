using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/review")]
public class ReviewController(DailyReviewService reviewService, WeeklyReportService weeklyService) : ControllerBase
{
    [HttpPost]
    public async Task<IActionResult> Upsert([FromBody] DailyReviewUpsertRequest request)
    {
        try
        {
            var result = await reviewService.UpsertAsync(request);
            return Ok(new { review = result.Review, xp = result.Xp });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("{date}")]
    public async Task<IActionResult> GetByDate(string date)
    {
        try
        {
            var result = await reviewService.GetByDateAsync(date);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("calendar")]
    public async Task<IActionResult> GetCalendar([FromQuery] int year, [FromQuery] int month)
    {
        if (month < 1 || month > 12)
            return BadRequest(new { error = "Month must be between 1 and 12." });

        var entries = await reviewService.GetCalendarAsync(year, month);
        return Ok(entries);
    }

    [HttpGet("search")]
    public async Task<IActionResult> Search([FromQuery] string q)
    {
        var results = await reviewService.SearchAsync(q);
        return Ok(results);
    }

    [HttpGet("weekly")]
    public async Task<IActionResult> GetWeekly([FromQuery] string? week)
    {
        try
        {
            var weekStr = week ?? WeeklyReportService.CurrentWeekIso();
            var report = await weeklyService.GetWeeklyAsync(weekStr);
            return Ok(report);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }
}
