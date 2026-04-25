using System.Diagnostics;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record WikiAgentRunRequest(
    string Task,
    string Prompt,
    string? RawFilePath = null,
    string? Query = null);

public record WikiAgentRunResult(
    bool Success,
    string Stdout,
    string Stderr,
    int? ExitCode,
    bool TimedOut,
    WikiAgentProfile Profile);

public class WikiAgentService(
    ProtocolDbContext db,
    IConfiguration configuration,
    ILogger<WikiAgentService> logger)
{
    private static readonly Encoding Utf8NoBom = new UTF8Encoding(false);

    private string VaultRoot => configuration["Protocol:VaultDirectory"]!;

    public async Task<IReadOnlyList<WikiAgentProfile>> GetProfilesAsync()
    {
        await EnsureSeedProfilesAsync();
        return await db.WikiAgentProfiles
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Name)
            .ToListAsync();
    }

    public async Task<WikiAgentProfile?> GetDefaultProfileAsync()
    {
        await EnsureSeedProfilesAsync();
        return await db.WikiAgentProfiles
            .Where(p => p.IsEnabled)
            .OrderByDescending(p => p.IsDefault)
            .ThenBy(p => p.Id)
            .FirstOrDefaultAsync();
    }

    public async Task<WikiAgentProfile> UpsertProfileAsync(WikiAgentProfile profile)
    {
        profile.Name = profile.Name.Trim();
        profile.Provider = string.IsNullOrWhiteSpace(profile.Provider) ? "custom" : profile.Provider.Trim().ToLowerInvariant();
        profile.Executable = profile.Executable.Trim();
        profile.ArgumentsTemplate = profile.ArgumentsTemplate.Trim();
        profile.Model = string.IsNullOrWhiteSpace(profile.Model) ? null : profile.Model.Trim();
        profile.TimeoutSeconds = Math.Clamp(profile.TimeoutSeconds, 10, 900);
        profile.UpdatedAt = DateTime.UtcNow;

        if (profile.Id == 0)
        {
            profile.CreatedAt = DateTime.UtcNow;
            db.WikiAgentProfiles.Add(profile);
        }
        else
        {
            var existing = await db.WikiAgentProfiles.FindAsync(profile.Id)
                ?? throw new InvalidOperationException("Agent profile not found.");
            existing.Name = profile.Name;
            existing.Provider = profile.Provider;
            existing.Executable = profile.Executable;
            existing.ArgumentsTemplate = profile.ArgumentsTemplate;
            existing.Model = profile.Model;
            existing.SendPromptToStdIn = profile.SendPromptToStdIn;
            existing.IsEnabled = profile.IsEnabled;
            existing.TimeoutSeconds = profile.TimeoutSeconds;
            existing.UpdatedAt = profile.UpdatedAt;
            profile = existing;
        }

        await db.SaveChangesAsync();
        return profile;
    }

    public async Task SetDefaultAsync(int id)
    {
        var profiles = await db.WikiAgentProfiles.ToListAsync();
        if (profiles.All(p => p.Id != id))
            throw new InvalidOperationException("Agent profile not found.");

        foreach (var profile in profiles)
            profile.IsDefault = profile.Id == id;

        await db.SaveChangesAsync();
    }

    public async Task DeleteProfileAsync(int id)
    {
        var profile = await db.WikiAgentProfiles.FindAsync(id)
            ?? throw new InvalidOperationException("Agent profile not found.");
        db.WikiAgentProfiles.Remove(profile);
        await db.SaveChangesAsync();
    }

    public async Task<object> GetStatusAsync()
    {
        var profile = await GetDefaultProfileAsync();
        return new
        {
            configured = profile is not null && !string.IsNullOrWhiteSpace(profile.Executable),
            profile = profile is null ? null : ToDto(profile)
        };
    }

    public async Task<object> TestProfileAsync(int id)
    {
        var profile = await db.WikiAgentProfiles.FindAsync(id)
            ?? throw new InvalidOperationException("Agent profile not found.");

        var result = await RunAsync(
            new WikiAgentRunRequest(
                "test",
                "Return only this JSON object and no other text: {\"ok\":true,\"message\":\"agent ready\"}"),
            profile);

        var ok = result.Success && ExtractJsonObject(result.Stdout) is not null;
        profile.LastTestedAt = DateTime.UtcNow;
        profile.LastTestStatus = ok ? "ok" : "failed";
        profile.LastTestMessage = ok
            ? "Agent returned valid JSON."
            : BuildFailureMessage(result);
        await db.SaveChangesAsync();

        return new
        {
            ok,
            profile = ToDto(profile),
            stdout = result.Stdout,
            stderr = result.Stderr,
            result.ExitCode,
            result.TimedOut
        };
    }

    public async Task<WikiAgentRunResult> RunAsync(WikiAgentRunRequest request, WikiAgentProfile? profile = null)
    {
        profile ??= await GetDefaultProfileAsync();
        if (profile is null || string.IsNullOrWhiteSpace(profile.Executable))
            throw new InvalidOperationException("No enabled wiki AI agent is configured.");

        var promptFile = Path.Combine(Path.GetTempPath(), $"protocol-wiki-agent-{Guid.NewGuid():N}.md");
        await File.WriteAllTextAsync(promptFile, request.Prompt);

        try
        {
            var args = ExpandTemplate(profile.ArgumentsTemplate, profile, request, promptFile);
            var argumentList = SplitArguments(args);
            var workingDirectory = Directory.Exists(VaultRoot) ? VaultRoot : AppContext.BaseDirectory;
            var resolvedExecutable = ResolveExecutable(profile.Executable);

            using var process = new Process();
            process.StartInfo = new ProcessStartInfo
            {
                FileName = resolvedExecutable,
                WorkingDirectory = workingDirectory,
                UseShellExecute = false,
                RedirectStandardOutput = true,
                RedirectStandardError = true,
                RedirectStandardInput = profile.SendPromptToStdIn,
                StandardOutputEncoding = Utf8NoBom,
                StandardErrorEncoding = Utf8NoBom,
                StandardInputEncoding = profile.SendPromptToStdIn ? Utf8NoBom : null,
                CreateNoWindow = true
            };

            // CLI tools (claude, codex, gemini) refuse to start when TERM=dumb because they
            // cannot display interactive confirmation prompts.  Override it so the subprocess
            // sees a real terminal type even though no TTY is attached.
            var envTerm = process.StartInfo.Environment.TryGetValue("TERM", out var t) ? t : null;
            if (string.IsNullOrEmpty(envTerm) ||
                envTerm.Equals("dumb", StringComparison.OrdinalIgnoreCase))
            {
                process.StartInfo.Environment["TERM"] = "xterm-256color";
            }

            AddFallbackPathEntries(process.StartInfo);

            if (NeedsCommandShell(resolvedExecutable))
            {
                process.StartInfo.FileName = GetCommandShell();
                process.StartInfo.Arguments = BuildCommandShellArguments(resolvedExecutable, argumentList);
            }
            else
            {
                foreach (var arg in argumentList)
                    process.StartInfo.ArgumentList.Add(arg);
            }

            logger.LogInformation(
                "Running wiki agent {Name} for {Task} with {Executable}",
                profile.Name,
                request.Task,
                resolvedExecutable);

            try
            {
                process.Start();
            }
            catch (Exception ex)
            {
                return new WikiAgentRunResult(
                    false,
                    "",
                    $"Failed to start '{profile.Executable}' (resolved to '{resolvedExecutable}') from '{workingDirectory}': {ex.Message}",
                    null,
                    false,
                    profile);
            }

            var stdoutTask = process.StandardOutput.ReadToEndAsync();
            var stderrTask = process.StandardError.ReadToEndAsync();

            if (profile.SendPromptToStdIn)
            {
                await process.StandardInput.WriteAsync(request.Prompt);
                process.StandardInput.Close();
            }

            using var cts = new CancellationTokenSource(TimeSpan.FromSeconds(profile.TimeoutSeconds));
            try
            {
                await process.WaitForExitAsync(cts.Token);
            }
            catch (OperationCanceledException)
            {
                TryKill(process);
                return new WikiAgentRunResult(false, await stdoutTask, await stderrTask, null, true, profile);
            }

            var stdout = await stdoutTask;
            var stderr = await stderrTask;
            var success = process.ExitCode == 0 && !string.IsNullOrWhiteSpace(stdout);

            if (!success)
            {
                logger.LogWarning(
                    "Wiki agent '{Name}' failed for task '{Task}': ExitCode={ExitCode}, " +
                    "StdoutEmpty={StdoutEmpty}, Stderr={Stderr}",
                    profile.Name,
                    request.Task,
                    process.ExitCode,
                    string.IsNullOrWhiteSpace(stdout),
                    string.IsNullOrWhiteSpace(stderr) ? "(none)" : stderr.Length > 800 ? stderr[..800] + "…" : stderr);
            }

            return new WikiAgentRunResult(success, stdout, stderr, process.ExitCode, false, profile);
        }
        finally
        {
            TryDelete(promptFile);
        }
    }

    public static object ToDto(WikiAgentProfile p) => new
    {
        p.Id,
        p.Name,
        p.Provider,
        p.Executable,
        p.ArgumentsTemplate,
        p.Model,
        p.SendPromptToStdIn,
        p.IsEnabled,
        p.IsDefault,
        p.TimeoutSeconds,
        p.CreatedAt,
        p.UpdatedAt,
        p.LastTestedAt,
        p.LastTestStatus,
        p.LastTestMessage
    };

    private async Task EnsureSeedProfilesAsync()
    {
        if (!await db.WikiAgentProfiles.AnyAsync())
        {
            var now = DateTime.UtcNow;
            db.WikiAgentProfiles.AddRange(
                new WikiAgentProfile
                {
                    Name = "Claude CLI",
                    Provider = "anthropic",
                    Executable = "claude",
                    // -p = print/non-interactive mode; --dangerously-skip-permissions bypasses
                    // confirmation prompts so it works when stdin/stderr is not a TTY.
                    ArgumentsTemplate = "-p --dangerously-skip-permissions",
                    SendPromptToStdIn = true,
                    IsDefault = false,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new WikiAgentProfile
                {
                    Name = "Codex CLI",
                    Provider = "codex",
                    Executable = "codex",
                    ArgumentsTemplate = "exec -C \"{vaultRoot}\" --skip-git-repo-check --ephemeral -",
                    SendPromptToStdIn = true,
                    IsDefault = true,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new WikiAgentProfile
                {
                    Name = "Gemini CLI",
                    Provider = "gemini",
                    Executable = "gemini",
                    ArgumentsTemplate = "-p",
                    SendPromptToStdIn = true,
                    IsDefault = false,
                    CreatedAt = now,
                    UpdatedAt = now
                },
                new WikiAgentProfile
                {
                    Name = "Ollama",
                    Provider = "ollama",
                    Executable = "ollama",
                    ArgumentsTemplate = "run {model}",
                    Model = "llama3.1",
                    SendPromptToStdIn = true,
                    IsDefault = false,
                    CreatedAt = now,
                    UpdatedAt = now
                });

            await db.SaveChangesAsync();
            return;
        }

        // Patch legacy databases that were seeded with the broken Codex exec profile.
        await PatchLegacyProfilesAsync();
    }

    /// <summary>
    /// Fixes broken seed data written by earlier versions of the app:
    /// - Codex profiles with bare "-" or old "exec --cd" args → corrected to
    ///   "exec -C {vaultRoot} --skip-git-repo-check --ephemeral -".
    /// - Ensures Codex CLI is the default agent (transfers IsDefault from Claude if needed).
    /// - Claude profiles get "--dangerously-skip-permissions" so they work when
    ///   stdin/stderr is not a TTY (ready for when the user switches back).
    /// </summary>
    private async Task PatchLegacyProfilesAsync()
    {
        var profiles = await db.WikiAgentProfiles.ToListAsync();
        var changed = false;

        const string correctCodexArgs = "exec -C \"{vaultRoot}\" --skip-git-repo-check --ephemeral -";

        // ── Codex: fix broken argument templates ────────────────────────────
        var brokenCodex = profiles.FirstOrDefault(p =>
            p.Provider == "codex" &&
            p.ArgumentsTemplate != correctCodexArgs &&
            (p.ArgumentsTemplate.Trim() == "-" ||
             p.ArgumentsTemplate.Contains("--cd") ||
             !p.ArgumentsTemplate.StartsWith("exec")));

        if (brokenCodex is not null)
        {
            logger.LogWarning(
                "Patching Codex CLI profile '{Name}': replacing broken args '{OldArgs}' with exec mode",
                brokenCodex.Name,
                brokenCodex.ArgumentsTemplate);

            brokenCodex.ArgumentsTemplate = correctCodexArgs;
            brokenCodex.UpdatedAt = DateTime.UtcNow;
            changed = true;
        }

        // ── Ensure Codex is the default agent ───────────────────────────────
        var codexProfile = profiles.FirstOrDefault(p =>
            p.Provider == "codex" ||
            p.Executable.Equals("codex", StringComparison.OrdinalIgnoreCase));

        if (codexProfile is not null && !codexProfile.IsDefault)
        {
            foreach (var p in profiles.Where(p => p.IsDefault))
            {
                p.IsDefault = false;
                p.UpdatedAt = DateTime.UtcNow;
            }

            codexProfile.IsDefault = true;
            codexProfile.UpdatedAt = DateTime.UtcNow;
            changed = true;

            logger.LogInformation(
                "Set Codex CLI profile '{Name}' as default agent",
                codexProfile.Name);
        }

        // ── Claude: ensure --dangerously-skip-permissions is present ─────────
        var claudeProfiles = profiles.Where(p =>
            p.Provider == "anthropic" ||
            p.Executable.Equals("claude", StringComparison.OrdinalIgnoreCase));

        foreach (var cp in claudeProfiles)
        {
            if (!cp.ArgumentsTemplate.Contains("--dangerously-skip-permissions"))
            {
                var oldArgs = cp.ArgumentsTemplate;
                cp.ArgumentsTemplate = cp.ArgumentsTemplate.TrimEnd() + " --dangerously-skip-permissions";
                cp.UpdatedAt = DateTime.UtcNow;
                changed = true;

                logger.LogWarning(
                    "Patching Claude CLI profile '{Name}': added --dangerously-skip-permissions to args (was '{OldArgs}')",
                    cp.Name,
                    oldArgs);
            }
        }

        if (changed)
            await db.SaveChangesAsync();
    }

    private string ExpandTemplate(
        string template,
        WikiAgentProfile profile,
        WikiAgentRunRequest request,
        string promptFile)
    {
        return template
            .Replace("{promptFile}", promptFile)
            .Replace("{vaultRoot}", VaultRoot)
            .Replace("{rawFile}", request.RawFilePath ?? "")
            .Replace("{schemaFile}", Path.Combine(VaultRoot, "WIKI-SCHEMA.md"))
            .Replace("{indexFile}", Path.Combine(VaultRoot, "index.md"))
            .Replace("{query}", request.Query ?? "")
            .Replace("{model}", profile.Model ?? "");
    }

    private static string BuildFailureMessage(WikiAgentRunResult result)
    {
        if (result.TimedOut) return "Agent timed out.";
        if (!string.IsNullOrWhiteSpace(result.Stderr)) return result.Stderr.Trim();
        if (!string.IsNullOrWhiteSpace(result.Stdout)) return "Agent did not return valid JSON.";
        return result.ExitCode is null ? "Agent failed to start." : $"Agent exited with code {result.ExitCode}.";
    }

    public static string? ExtractJsonObject(string text)
    {
        text = StripMarkdownCodeFences(text);
        var start = text.IndexOf('{');
        var end = text.LastIndexOf('}');
        return start >= 0 && end >= start ? text[start..(end + 1)] : null;
    }

    /// <summary>
    /// Removes a single wrapping markdown code fence (``` or ```json) that LLMs commonly
    /// add around their output, leaving only the raw content inside.
    /// </summary>
    public static string StripMarkdownCodeFences(string text)
    {
        text = text.Trim();

        if (text.StartsWith("```"))
        {
            var newline = text.IndexOf('\n');
            if (newline >= 0)
                text = text[(newline + 1)..].TrimStart();
        }

        if (text.EndsWith("```"))
        {
            var lastNewline = text.LastIndexOf('\n', text.Length - 4);
            if (lastNewline >= 0)
                text = text[..lastNewline].TrimEnd();
        }

        return text.Trim();
    }

    private static IReadOnlyList<string> SplitArguments(string arguments)
    {
        var result = new List<string>();
        var current = new StringBuilder();
        var inQuotes = false;
        var quoteChar = '\0';

        for (var i = 0; i < arguments.Length; i++)
        {
            var ch = arguments[i];
            if ((ch == '"' || ch == '\'') && (!inQuotes || ch == quoteChar))
            {
                inQuotes = !inQuotes;
                quoteChar = inQuotes ? ch : '\0';
                continue;
            }

            if (char.IsWhiteSpace(ch) && !inQuotes)
            {
                if (current.Length > 0)
                {
                    result.Add(current.ToString());
                    current.Clear();
                }
                continue;
            }

            current.Append(ch);
        }

        if (current.Length > 0)
            result.Add(current.ToString());

        return result;
    }

    private static string ResolveExecutable(string executable)
    {
        executable = executable.Trim().Trim('"');
        if (string.IsNullOrWhiteSpace(executable))
            return executable;

        if (IsPathLike(executable))
            return ResolvePathLikeExecutable(executable);

        foreach (var directory in GetExecutableSearchDirectories())
        {
            foreach (var candidateName in GetExecutableCandidateNames(executable))
            {
                var candidate = Path.Combine(directory, candidateName);
                if (File.Exists(candidate))
                    return candidate;
            }
        }

        return executable;
    }

    private static string ResolvePathLikeExecutable(string executable)
    {
        var fullPath = Path.GetFullPath(executable);
        if (File.Exists(fullPath))
            return fullPath;

        foreach (var candidateName in GetExecutableCandidateNames(fullPath))
        {
            if (File.Exists(candidateName))
                return candidateName;
        }

        return executable;
    }

    private static bool IsPathLike(string executable)
    {
        return Path.IsPathFullyQualified(executable)
            || executable.Contains(Path.DirectorySeparatorChar)
            || executable.Contains(Path.AltDirectorySeparatorChar);
    }

    private static IEnumerable<string> GetExecutableCandidateNames(string executable)
    {
        if (!OperatingSystem.IsWindows() || Path.HasExtension(executable))
        {
            yield return executable;
            yield break;
        }

        yield return $"{executable}.exe";
        yield return $"{executable}.cmd";
        yield return $"{executable}.bat";
        yield return $"{executable}.com";
        yield return executable;
    }

    private static IReadOnlyList<string> GetExecutableSearchDirectories()
    {
        var directories = new List<string>();

        void Add(string? path)
        {
            if (string.IsNullOrWhiteSpace(path) || !Directory.Exists(path))
                return;

            if (!directories.Any(existing => string.Equals(existing, path, StringComparison.OrdinalIgnoreCase)))
                directories.Add(path);
        }

        Add(AppContext.BaseDirectory);

        var pathEntries = (Environment.GetEnvironmentVariable("PATH") ?? "")
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
        foreach (var entry in pathEntries)
            Add(entry);

        if (OperatingSystem.IsWindows())
        {
            var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
            var localAppData = Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData);
            var programFiles = Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles);

            Add(Path.Combine(appData, "npm"));
            Add(Path.Combine(programFiles, "nodejs"));
            Add(Path.Combine(localAppData, "OpenAI", "Codex", "bin"));

            var windowsApps = Path.Combine(programFiles, "WindowsApps");
            try
            {
                foreach (var packageDirectory in Directory.GetDirectories(windowsApps, "OpenAI.Codex_*"))
                    Add(Path.Combine(packageDirectory, "app", "resources"));
            }
            catch
            {
                // WindowsApps may deny enumeration outside an interactive shell.
            }
        }

        return directories;
    }

    private static void AddFallbackPathEntries(ProcessStartInfo startInfo)
    {
        if (!OperatingSystem.IsWindows())
            return;

        var currentPath = startInfo.Environment.TryGetValue("PATH", out var path) && !string.IsNullOrEmpty(path)
            ? path
            : Environment.GetEnvironmentVariable("PATH") ?? "";

        var pathEntries = currentPath
            .Split(Path.PathSeparator, StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries)
            .ToList();

        foreach (var directory in GetExecutableSearchDirectories())
        {
            if (!pathEntries.Any(entry => string.Equals(entry, directory, StringComparison.OrdinalIgnoreCase)))
                pathEntries.Add(directory);
        }

        startInfo.Environment["PATH"] = string.Join(Path.PathSeparator, pathEntries);
    }

    private static bool NeedsCommandShell(string executable)
    {
        if (!OperatingSystem.IsWindows())
            return false;

        var extension = Path.GetExtension(executable);
        return extension.Equals(".cmd", StringComparison.OrdinalIgnoreCase)
            || extension.Equals(".bat", StringComparison.OrdinalIgnoreCase);
    }

    private static string GetCommandShell()
    {
        return Environment.GetEnvironmentVariable("ComSpec") ?? "cmd.exe";
    }

    private static string BuildCommandShellArguments(string executable, IReadOnlyList<string> arguments)
    {
        return $"/d /s /c \"{BuildCommandShellCommand(executable, arguments)}\"";
    }

    private static string BuildCommandShellCommand(string executable, IReadOnlyList<string> arguments)
    {
        return string.Join(" ", new[] { QuoteForCommandShell(executable) }.Concat(arguments.Select(QuoteForCommandShell)));
    }

    private static string QuoteForCommandShell(string value)
    {
        return $"\"{value.Replace("\"", "\\\"")}\"";
    }

    private static void TryKill(Process process)
    {
        try
        {
            if (!process.HasExited) process.Kill(entireProcessTree: true);
        }
        catch
        {
            // Best effort only.
        }
    }

    private static void TryDelete(string path)
    {
        try
        {
            if (File.Exists(path)) File.Delete(path);
        }
        catch
        {
            // Temp cleanup is best effort only.
        }
    }
}
