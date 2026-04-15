using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/notifications")]
public class NotificationController(NotificationService notifications) : ControllerBase
{
    [HttpGet("vapid-public-key")]
    public IActionResult GetVapidPublicKey()
    {
        var key = notifications.GetVapidPublicKey();
        return Ok(new { publicKey = key });
    }

    [HttpPost("subscribe")]
    public async Task<IActionResult> Subscribe([FromBody] PushSubscriptionDto dto)
    {
        await notifications.SubscribeAsync(dto);
        return Ok(new { status = "subscribed" });
    }

    [HttpPost("unsubscribe")]
    public async Task<IActionResult> Unsubscribe([FromBody] UnsubscribeRequest request)
    {
        await notifications.UnsubscribeAsync(request.Endpoint);
        return Ok(new { status = "unsubscribed" });
    }

    [HttpGet("preferences")]
    public async Task<IActionResult> GetPreferences()
    {
        var prefs = await notifications.GetPreferencesAsync();
        return Ok(prefs);
    }

    [HttpPut("preferences")]
    public async Task<IActionResult> UpdatePreferences([FromBody] NotificationPreferenceDto dto)
    {
        var result = await notifications.UpdatePreferencesAsync(dto);
        return Ok(result);
    }

    [HttpPost("test")]
    public async Task<IActionResult> SendTest()
    {
        await notifications.SendToAllAsync("Protocol", "Test notification — push is working!", "test");
        return Ok(new { status = "sent" });
    }
}

public record UnsubscribeRequest(string Endpoint);
