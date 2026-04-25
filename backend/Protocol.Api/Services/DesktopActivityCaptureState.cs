namespace Protocol.Api.Services;

public record DesktopActivityCaptureStatusDto(
    bool Enabled,
    bool Supported,
    bool Running,
    DateTime? LastObservedAtUtc,
    string? LastObservedProcess,
    string? LastWindowTitle,
    string? LastCapturedUrl,
    string? LastCapturedDomain,
    string? LastError,
    string? ActiveSessionKey
);

public class DesktopActivityCaptureState
{
    private readonly object sync = new();

    private bool enabled;
    private bool supported;
    private bool running;
    private DateTime? lastObservedAtUtc;
    private string? lastObservedProcess;
    private string? lastWindowTitle;
    private string? lastCapturedUrl;
    private string? lastCapturedDomain;
    private string? lastError;
    private string? activeSessionKey;

    public void Configure(bool isEnabled, bool isSupported)
    {
        lock (sync)
        {
            enabled = isEnabled;
            supported = isSupported;
        }
    }

    public void SetRunning(bool isRunning)
    {
        lock (sync)
        {
            running = isRunning;
        }
    }

    public void Observe(string? processName, string? windowTitle, string? url, string? domain, string? error)
    {
        lock (sync)
        {
            lastObservedAtUtc = DateTime.UtcNow;
            lastObservedProcess = processName;
            lastWindowTitle = windowTitle;
            lastCapturedUrl = url;
            lastCapturedDomain = domain;
            lastError = error;
        }
    }

    public void SetActiveSession(string? sessionKey)
    {
        lock (sync)
        {
            activeSessionKey = sessionKey;
        }
    }

    public DesktopActivityCaptureStatusDto Snapshot()
    {
        lock (sync)
        {
            return new DesktopActivityCaptureStatusDto(
                enabled,
                supported,
                running,
                lastObservedAtUtc,
                lastObservedProcess,
                lastWindowTitle,
                lastCapturedUrl,
                lastCapturedDomain,
                lastError,
                activeSessionKey
            );
        }
    }
}
