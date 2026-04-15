using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Controllers;

[ApiController]
[Route("api/blocked-sites")]
public class BlockedSitesController(ProtocolDbContext db) : ControllerBase
{
    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var sites = await db.BlockedSites
            .OrderBy(s => s.Domain)
            .Select(s => new { s.Id, s.Domain, s.IsActive })
            .ToListAsync();
        return Ok(sites);
    }

    [HttpPost]
    public async Task<IActionResult> Add([FromBody] AddBlockedSiteRequest request)
    {
        var domain = request.Domain?.Trim().ToLowerInvariant();
        if (string.IsNullOrWhiteSpace(domain))
            return BadRequest(new { error = "Domain is required" });

        var exists = await db.BlockedSites.AnyAsync(s => s.Domain == domain);
        if (exists)
            return Conflict(new { error = "Domain already exists" });

        var site = new BlockedSite { Domain = domain, IsActive = true };
        db.BlockedSites.Add(site);
        await db.SaveChangesAsync();

        return Ok(new { site.Id, site.Domain, site.IsActive });
    }

    [HttpDelete("{id:int}")]
    public async Task<IActionResult> Delete(int id)
    {
        var site = await db.BlockedSites.FindAsync(id);
        if (site is null)
            return NotFound(new { error = "Site not found" });

        db.BlockedSites.Remove(site);
        await db.SaveChangesAsync();

        return Ok(new { removed = true });
    }

    [HttpPut("{id:int}/toggle")]
    public async Task<IActionResult> Toggle(int id)
    {
        var site = await db.BlockedSites.FindAsync(id);
        if (site is null)
            return NotFound(new { error = "Site not found" });

        site.IsActive = !site.IsActive;
        await db.SaveChangesAsync();

        return Ok(new { site.Id, site.Domain, site.IsActive });
    }
}

public record AddBlockedSiteRequest(string? Domain);
