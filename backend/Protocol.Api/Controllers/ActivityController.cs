using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/activity")]
public class ActivityController(
    ActivityService activityService,
    WebsiteProductivityMlService mlService,
    DesktopActivityCaptureState desktopCaptureState) : ControllerBase
{
    [HttpPost("heartbeat")]
    public async Task<IActionResult> Heartbeat([FromBody] ActivityHeartbeatRequest request)
    {
        try
        {
            return Ok(await activityService.HeartbeatAsync(request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpPost("finalize")]
    public async Task<IActionResult> FinalizeSession([FromBody] ActivityFinalizeRequest request)
    {
        try
        {
            var finalized = await activityService.FinalizeAsync(request);
            return Ok(new { finalized });
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] string? period = "week")
    {
        return Ok(await activityService.GetSummaryAsync(period));
    }

    [HttpGet("labels")]
    public async Task<IActionResult> Labels()
    {
        return Ok(await activityService.GetLabelsAsync());
    }

    [HttpPut("labels")]
    public async Task<IActionResult> UpsertLabel([FromBody] ActivityLabelRequest request)
    {
        try
        {
            return Ok(await activityService.UpsertLabelAsync(request));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    [HttpGet("model/status")]
    public async Task<IActionResult> ModelStatus()
    {
        return Ok(await mlService.GetStatusAsync());
    }

    [HttpGet("capture/status")]
    public IActionResult CaptureStatus()
    {
        return Ok(desktopCaptureState.Snapshot());
    }

    [HttpPost("train")]
    public async Task<IActionResult> Train()
    {
        var result = await mlService.TrainAsync();
        if (result.Succeeded)
            await activityService.ApplyPredictionsAsync();

        return Ok(result);
    }
}
