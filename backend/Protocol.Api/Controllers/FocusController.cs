using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Data;
using Protocol.Api.Models;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/focus")]
public class FocusController(FocusService focusService, ProtocolDbContext db) : ControllerBase
{
    // POST /api/focus/start
    [HttpPost("start")]
    public async Task<IActionResult> Start()
    {
        try
        {
            var session = await focusService.StartAsync();
            return Ok(session);
        }
        catch (InvalidOperationException ex)
        {
            return Conflict(new { error = ex.Message });
        }
    }

    // POST /api/focus/stop
    [HttpPost("stop")]
    public async Task<IActionResult> Stop()
    {
        try
        {
            var result = await focusService.StopAsync();
            return Ok(new { session = result.Session, xp = result.Xp });
        }
        catch (KeyNotFoundException ex)
        {
            return NotFound(new { error = ex.Message });
        }
    }

    // GET /api/focus/current
    [HttpGet("current")]
    public async Task<IActionResult> GetCurrent()
    {
        var result = await focusService.GetCurrentAsync();
        return Ok(result);
    }

    // GET /api/focus/history
    [HttpGet("history")]
    public async Task<IActionResult> GetHistory()
    {
        var sessions = await focusService.GetHistoryAsync();
        return Ok(sessions);
    }

    // GET /api/focus/blocked-attempts/recent?seconds=45
    [HttpGet("blocked-attempts/recent")]
    public async Task<IActionResult> GetRecentBlockedAttempt([FromQuery] int seconds = 45)
    {
        seconds = Math.Clamp(seconds, 5, 300);
        var since = DateTime.UtcNow.AddSeconds(-seconds);

        var attempt = await db.BlockedAttempts
            .Where(a => a.BlockedAt >= since)
            .OrderByDescending(a => a.BlockedAt)
            .Select(a => new
            {
                a.Id,
                a.Domain,
                a.BlockedAt,
                a.BlockLabel,
                a.BlockType
            })
            .FirstOrDefaultAsync();

        return Ok(attempt);
    }

    // POST /api/focus/blocked-attempt — log a blocked site attempt from the Chrome extension
    [HttpPost("blocked-attempt")]
    public async Task<IActionResult> LogBlockedAttempt([FromBody] BlockedAttemptRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Domain))
            return BadRequest(new { error = "Domain is required" });

        var attempt = new BlockedAttempt
        {
            Domain = request.Domain.Trim().ToLowerInvariant(),
            BlockedAt = request.BlockedAt ?? DateTime.UtcNow,
            BlockLabel = request.BlockLabel,
            BlockType = request.BlockType
        };

        db.BlockedAttempts.Add(attempt);
        await db.SaveChangesAsync();

        return Ok(new { logged = true, attempt.Id });
    }
}

public record BlockedAttemptRequest(string? Domain, DateTime? BlockedAt, string? BlockLabel, string? BlockType);
