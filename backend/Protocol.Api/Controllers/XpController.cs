using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/xp")]
public class XpController(XpService xpService) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetSummary()
    {
        var summary = await xpService.GetSummaryAsync();
        return Ok(summary);
    }
}
