using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/habits")]
public class HabitController(HabitService habitService) : ControllerBase
{
    // GET /api/habits/today
    [HttpGet("today")]
    public async Task<IActionResult> GetToday()
    {
        var habits = await habitService.GetTodayAsync();
        return Ok(habits);
    }

    // GET /api/habits/streaks
    [HttpGet("streaks")]
    public async Task<IActionResult> GetStreaks()
    {
        var streaks = await habitService.GetStreaksAsync();
        return Ok(streaks);
    }

    // POST /api/habits/{id}/check
    [HttpPost("{id:int}/check")]
    public async Task<IActionResult> Check(int id)
    {
        try
        {
            var result = await habitService.CheckAsync(id);
            return Ok(new { habit = result.Habit, xp = result.Xp });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // DELETE /api/habits/{id}/check
    [HttpDelete("{id:int}/check")]
    public async Task<IActionResult> Uncheck(int id)
    {
        try
        {
            var result = await habitService.UncheckAsync(id);
            return Ok(new { habit = result.Habit, xp = result.Xp });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }
}
