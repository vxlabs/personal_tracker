using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Text;
using FlaUI.Core.AutomationElements;
using FlaUI.Core.Definitions;
using FlaUI.UIA3;

namespace Protocol.Api.Services;

public class DesktopActivityHostedService(
    IServiceScopeFactory scopeFactory,
    DesktopActivityCaptureState captureState,
    ILogger<DesktopActivityHostedService> logger) : BackgroundService
{
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(5);
    private static readonly TimeSpan IdleLimit = TimeSpan.FromSeconds(120);

    private static readonly IReadOnlyDictionary<string, string> SupportedBrowsers =
        new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["firefox"] = "firefox",
            ["chrome"] = "chrome",
            ["msedge"] = "edge",
            ["brave"] = "brave"
        };

    private readonly UiAutomationUrlReader urlReader = new();
    private CaptureSession? currentSession;

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        var enabled = string.Equals(
            Environment.GetEnvironmentVariable("PROTOCOL_DESKTOP_ACTIVITY"),
            "1",
            StringComparison.Ordinal);
        var supported = OperatingSystem.IsWindows();

        captureState.Configure(enabled, supported);

        if (!enabled || !supported)
        {
            captureState.SetRunning(false);
            return;
        }

        captureState.SetRunning(true);
        logger.LogInformation("Desktop activity capture is enabled.");

        try
        {
            using var timer = new PeriodicTimer(PollInterval);
            await CaptureOnceAsync(stoppingToken);

            while (await timer.WaitForNextTickAsync(stoppingToken))
            {
                await CaptureOnceAsync(stoppingToken);
            }
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
            // Normal shutdown.
        }
        finally
        {
            await FinalizeCurrentSessionAsync(DateTime.UtcNow, stoppingToken);
            captureState.SetRunning(false);
        }
    }

    private async Task CaptureOnceAsync(CancellationToken cancellationToken)
    {
        var observedAtUtc = DateTime.UtcNow;

        try
        {
            if (GetIdleTime() >= IdleLimit)
            {
                captureState.Observe(null, null, null, null, "System idle");
                await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
                return;
            }

            var foreground = GetForegroundWindow();
            if (foreground == IntPtr.Zero)
            {
                captureState.Observe(null, null, null, null, "No foreground window");
                await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
                return;
            }

            var processName = GetForegroundProcessName(foreground);
            var title = GetWindowTitle(foreground);
            if (processName is null || !SupportedBrowsers.TryGetValue(processName, out var browserName))
            {
                captureState.Observe(processName, title, null, null, null);
                await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
                return;
            }

            var url = urlReader.TryReadUrl(foreground, out var readError);
            if (url is null)
            {
                captureState.Observe(processName, title, null, null, readError ?? "Browser URL unavailable");
                await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
                return;
            }

            var domain = ExtractDomain(url);
            captureState.Observe(processName, title, url, domain, null);

            if (currentSession is null || !string.Equals(currentSession.Url, url, StringComparison.Ordinal))
            {
                await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
                currentSession = new CaptureSession(
                    $"{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}-{Guid.NewGuid():N}",
                    url,
                    domain,
                    title,
                    observedAtUtc,
                    observedAtUtc,
                    $"desktop-{browserName}"
                );
                captureState.SetActiveSession(currentSession.SessionKey);
                await SendHeartbeatAsync(currentSession, observedAtUtc, 1, cancellationToken);
                return;
            }

            currentSession = currentSession with { Title = title };
            var activeSeconds = Math.Max(1, (int)Math.Round((observedAtUtc - currentSession.LastSentAtUtc).TotalSeconds));
            currentSession = currentSession with { LastSentAtUtc = observedAtUtc };
            await SendHeartbeatAsync(currentSession, observedAtUtc, activeSeconds, cancellationToken);
        }
        catch (Exception ex)
        {
            logger.LogWarning(ex, "Desktop activity capture poll failed.");
            captureState.Observe(null, null, null, null, ex.Message);
            await FinalizeCurrentSessionAsync(observedAtUtc, cancellationToken);
        }
    }

    private async Task SendHeartbeatAsync(
        CaptureSession session,
        DateTime observedAtUtc,
        int activeSeconds,
        CancellationToken cancellationToken)
    {
        using var scope = scopeFactory.CreateScope();
        var activityService = scope.ServiceProvider.GetRequiredService<ActivityService>();
        await activityService.HeartbeatAsync(new ActivityHeartbeatRequest(
            session.SessionKey,
            session.Url,
            session.Domain,
            session.Title,
            session.StartedAtUtc,
            observedAtUtc,
            activeSeconds,
            session.SourceBrowser
        ));
    }

    private async Task FinalizeCurrentSessionAsync(DateTime endedAtUtc, CancellationToken cancellationToken)
    {
        if (currentSession is null)
        {
            captureState.SetActiveSession(null);
            return;
        }

        var session = currentSession;
        currentSession = null;
        captureState.SetActiveSession(null);

        try
        {
            using var scope = scopeFactory.CreateScope();
            var activityService = scope.ServiceProvider.GetRequiredService<ActivityService>();
            await activityService.FinalizeAsync(new ActivityFinalizeRequest(session.SessionKey, endedAtUtc));
        }
        catch (Exception ex) when (!cancellationToken.IsCancellationRequested)
        {
            logger.LogWarning(ex, "Failed to finalize desktop activity session.");
            captureState.Observe(null, null, null, null, ex.Message);
        }
    }

    private static string? GetForegroundProcessName(IntPtr windowHandle)
    {
        _ = GetWindowThreadProcessId(windowHandle, out var processId);
        if (processId == 0) return null;

        try
        {
            using var process = Process.GetProcessById((int)processId);
            return process.ProcessName;
        }
        catch
        {
            return null;
        }
    }

    private static string? GetWindowTitle(IntPtr windowHandle)
    {
        var length = GetWindowTextLength(windowHandle);
        if (length <= 0) return null;

        var builder = new StringBuilder(length + 1);
        return GetWindowText(windowHandle, builder, builder.Capacity) > 0
            ? builder.ToString()
            : null;
    }

    private static TimeSpan GetIdleTime()
    {
        var info = new LastInputInfo
        {
            CbSize = (uint)Marshal.SizeOf<LastInputInfo>()
        };

        if (!GetLastInputInfo(ref info))
            return TimeSpan.Zero;

        var lastInputTick = unchecked((uint)info.DwTime);
        var currentTick = unchecked((uint)Environment.TickCount);
        var idleMilliseconds = unchecked(currentTick - lastInputTick);
        return TimeSpan.FromMilliseconds(Math.Max(0, idleMilliseconds));
    }

    private static string ExtractDomain(string url)
    {
        var host = new Uri(url).Host.ToLowerInvariant();
        return host.StartsWith("www.", StringComparison.Ordinal) ? host[4..] : host;
    }

    [DllImport("user32.dll")]
    private static extern IntPtr GetForegroundWindow();

    [DllImport("user32.dll")]
    private static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint processId);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowText(IntPtr hWnd, StringBuilder text, int maxCount);

    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern int GetWindowTextLength(IntPtr hWnd);

    [DllImport("user32.dll")]
    private static extern bool GetLastInputInfo(ref LastInputInfo plii);

    [StructLayout(LayoutKind.Sequential)]
    private struct LastInputInfo
    {
        public uint CbSize;
        public uint DwTime;
    }

    private sealed record CaptureSession(
        string SessionKey,
        string Url,
        string Domain,
        string? Title,
        DateTime StartedAtUtc,
        DateTime LastSentAtUtc,
        string SourceBrowser
    );

    private sealed class UiAutomationUrlReader : IDisposable
    {
        private readonly UIA3Automation automation = new();

        public void Dispose() => automation.Dispose();

        public string? TryReadUrl(IntPtr browserWindow, out string? error)
        {
            error = null;

            try
            {
                var root = automation.FromHandle(browserWindow);
                if (root is null)
                {
                    error = "Browser automation root unavailable";
                    return null;
                }

                var cf = automation.ConditionFactory;
                var editElements = root.FindAllDescendants(cf.ByControlType(ControlType.Edit));

                foreach (var element in editElements)
                {
                    if (!LooksLikeAddressBar(element))
                        continue;

                    var value = GetValue(element);
                    if (TryNormalizeUrl(value, out var normalized))
                        return normalized;
                }

                error = $"Address bar not found ({editElements.Length} edit controls scanned)";
                return null;
            }
            catch (Exception ex)
            {
                error = ex.Message;
                return null;
            }
        }

        private static bool LooksLikeAddressBar(AutomationElement element)
        {
            var automationId = element.Properties.AutomationId.ValueOrDefault ?? "";
            var name = element.Properties.Name.ValueOrDefault ?? "";
            var className = element.Properties.ClassName.ValueOrDefault ?? "";

            var haystack = $"{automationId} {name} {className}".ToLowerInvariant();
            return haystack.Contains("address", StringComparison.Ordinal)
                || haystack.Contains("url", StringComparison.Ordinal)
                || haystack.Contains("location", StringComparison.Ordinal)
                || haystack.Contains("search", StringComparison.Ordinal)
                || haystack.Contains("autocomplete", StringComparison.Ordinal);
        }

        private static string? GetValue(AutomationElement element)
        {
            try
            {
                var valuePattern = element.Patterns.Value.PatternOrDefault;
                return valuePattern?.Value.ValueOrDefault;
            }
            catch
            {
                return null;
            }
        }

        private static bool TryNormalizeUrl(string? raw, out string normalized)
        {
            normalized = string.Empty;
            if (string.IsNullOrWhiteSpace(raw)) return false;

            var candidate = raw.Trim();

            if (!candidate.Contains("://", StringComparison.Ordinal))
                candidate = "https://" + candidate;

            if (!Uri.TryCreate(candidate, UriKind.Absolute, out var uri)) return false;
            if (uri.Scheme is not ("http" or "https")) return false;

            var builder = new UriBuilder(uri.Scheme, uri.Host, uri.IsDefaultPort ? -1 : uri.Port, uri.AbsolutePath);
            normalized = builder.Uri.ToString().TrimEnd('?').TrimEnd('#');
            return true;
        }
    }
}
