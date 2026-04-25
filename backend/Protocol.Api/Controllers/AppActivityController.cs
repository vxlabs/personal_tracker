using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/app-activity")]
public class AppActivityController(
    AppActivityService appActivityService,
    AppCategoryMlService mlService) : ControllerBase
{
    [HttpGet("summary")]
    public async Task<IActionResult> Summary([FromQuery] string? period = "today")
    {
        return Ok(await appActivityService.GetSummaryAsync(period ?? "today"));
    }

    [HttpGet("labels")]
    public async Task<IActionResult> Labels()
    {
        return Ok(await appActivityService.GetLabelsAsync());
    }

    [HttpPut("labels")]
    public async Task<IActionResult> UpsertLabel([FromBody] AppLabelUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.ProcessName) || string.IsNullOrWhiteSpace(request.Label))
            return BadRequest(new { error = "ProcessName and Label are required." });

        return Ok(await appActivityService.UpsertLabelAsync(request.ProcessName, request.Label));
    }

    [HttpGet("model/status")]
    public async Task<IActionResult> ModelStatus()
    {
        return Ok(await mlService.GetStatusAsync());
    }

    [HttpPost("train")]
    public async Task<IActionResult> Train()
    {
        var result = await mlService.TrainAsync();
        if (result.Succeeded)
            await appActivityService.ApplyPredictionsAsync();

        return Ok(result);
    }
}

public record AppLabelUpsertRequest(string ProcessName, string Label);
