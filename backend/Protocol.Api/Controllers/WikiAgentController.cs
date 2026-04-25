using Microsoft.AspNetCore.Mvc;
using Protocol.Api.Models;
using Protocol.Api.Services;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/wiki/agent")]
public class WikiAgentController(WikiAgentService agentService) : ControllerBase
{
    [HttpGet("profiles")]
    public async Task<IActionResult> GetProfiles()
    {
        var profiles = await agentService.GetProfilesAsync();
        return Ok(profiles.Select(WikiAgentService.ToDto));
    }

    [HttpGet("status")]
    public async Task<IActionResult> GetStatus()
    {
        return Ok(await agentService.GetStatusAsync());
    }

    [HttpPost("profiles")]
    public async Task<IActionResult> CreateProfile([FromBody] WikiAgentProfileRequest request)
    {
        var profile = await agentService.UpsertProfileAsync(ToProfile(request));
        return Ok(WikiAgentService.ToDto(profile));
    }

    [HttpPut("profiles/{id:int}")]
    public async Task<IActionResult> UpdateProfile(int id, [FromBody] WikiAgentProfileRequest request)
    {
        var profile = ToProfile(request);
        profile.Id = id;
        var saved = await agentService.UpsertProfileAsync(profile);
        return Ok(WikiAgentService.ToDto(saved));
    }

    [HttpDelete("profiles/{id:int}")]
    public async Task<IActionResult> DeleteProfile(int id)
    {
        await agentService.DeleteProfileAsync(id);
        return NoContent();
    }

    [HttpPost("profiles/{id:int}/set-default")]
    public async Task<IActionResult> SetDefault(int id)
    {
        await agentService.SetDefaultAsync(id);
        return Ok(new { status = "default-set" });
    }

    [HttpPost("profiles/{id:int}/test")]
    public async Task<IActionResult> TestProfile(int id)
    {
        return Ok(await agentService.TestProfileAsync(id));
    }

    private static WikiAgentProfile ToProfile(WikiAgentProfileRequest request) => new()
    {
        Name = request.Name,
        Provider = request.Provider,
        Executable = request.Executable,
        ArgumentsTemplate = request.ArgumentsTemplate,
        Model = request.Model,
        SendPromptToStdIn = request.SendPromptToStdIn,
        IsEnabled = request.IsEnabled,
        TimeoutSeconds = request.TimeoutSeconds
    };
}

public record WikiAgentProfileRequest(
    string Name,
    string Provider,
    string Executable,
    string ArgumentsTemplate,
    string? Model,
    bool SendPromptToStdIn,
    bool IsEnabled,
    int TimeoutSeconds);
