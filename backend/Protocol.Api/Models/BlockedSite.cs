namespace Protocol.Api.Models;

public class BlockedSite
{
    public int Id { get; set; }
    public string Domain { get; set; } = string.Empty;
    public bool IsActive { get; set; } = true;
}
