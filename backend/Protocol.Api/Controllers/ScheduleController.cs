using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/schedule")]
public class ScheduleController(ScheduleService schedule) : ControllerBase
{
    // GET /api/schedule — full week grouped by day
    [HttpGet]
    public async Task<IActionResult> GetFullWeek()
    {
        var result = await schedule.GetFullWeekAsync();
        return Ok(result);
    }

    // GET /api/schedule/now — current block + next block in IST
    [HttpGet("now")]
    public async Task<IActionResult> GetNow()
    {
        var result = await schedule.GetNowAsync();
        return Ok(result);
    }

    // GET /api/schedule/{day} — blocks for a specific day (e.g. "monday")
    [HttpGet("{day}")]
    public async Task<IActionResult> GetDay(string day)
    {
        if (!Enum.TryParse<DayOfWeek>(day, ignoreCase: true, out var dow))
            return BadRequest(new { error = $"Invalid day '{day}'. Use: monday, tuesday, wednesday, thursday, friday, saturday, sunday." });

        var result = await schedule.GetDayAsync(dow);
        return Ok(result);
    }

    // PUT /api/schedule/{day} — replace all blocks for a day
    [HttpPut("{day}")]
    public async Task<IActionResult> UpdateDay(string day, [FromBody] List<BlockInput> blocks)
    {
        if (!Enum.TryParse<DayOfWeek>(day, ignoreCase: true, out var dow))
            return BadRequest(new { error = $"Invalid day '{day}'." });

        try
        {
            var result = await schedule.UpdateDayAsync(dow, blocks);
            return Ok(result);
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // POST /api/schedule/duplicate — copy one day's blocks to another
    [HttpPost("duplicate")]
    public async Task<IActionResult> DuplicateDay([FromBody] DuplicateDayRequest request)
    {
        if (!Enum.TryParse<DayOfWeek>(request.FromDay, ignoreCase: true, out var from))
            return BadRequest(new { error = $"Invalid fromDay '{request.FromDay}'." });

        if (!Enum.TryParse<DayOfWeek>(request.ToDay, ignoreCase: true, out var to))
            return BadRequest(new { error = $"Invalid toDay '{request.ToDay}'." });

        try
        {
            var result = await schedule.DuplicateDayAsync(from, to);
            return Ok(result);
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
