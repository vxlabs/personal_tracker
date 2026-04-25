namespace Protocol.Api.Models;

public class WikiAgentProfile
{
    public int Id { get; set; }
    public string Name { get; set; } = "";
    public string Provider { get; set; } = "custom";
    public string Executable { get; set; } = "";
    public string ArgumentsTemplate { get; set; } = "";
    public string? Model { get; set; }
    public bool SendPromptToStdIn { get; set; } = true;
    public bool IsEnabled { get; set; } = true;
    public bool IsDefault { get; set; }
    public int TimeoutSeconds { get; set; } = 120;
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
    public DateTime? LastTestedAt { get; set; }
    public string? LastTestStatus { get; set; }
    public string? LastTestMessage { get; set; }
}
