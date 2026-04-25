using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record ActivityHeartbeatRequest(
    string? SessionKey,
    string? Url,
    string? Domain,
    string? Title,
    DateTime? StartedAtUtc,
    DateTime? ObservedAtUtc,
    int ActiveSeconds,
    string? SourceBrowser
);

public record ActivityFinalizeRequest(string? SessionKey, DateTime? EndedAtUtc);

public record ActivityLabelRequest(
    string? Scope,
    string? Target,
    string? Domain,
    string? Url,
    string? Label
);

public record ActivitySessionDto(
    int Id,
    string SessionKey,
    string Url,
    string Domain,
    string? Title,
    DateTime StartedAtUtc,
    DateTime LastSeenAtUtc,
    DateTime? EndedAtUtc,
    int ActiveSeconds,
    string ProductivityLabel,
    string LabelSource,
    float? PredictionConfidence
);

public record ActivityLabelDto(
    int Id,
    string Scope,
    string Target,
    string Domain,
    string? Url,
    string Label,
    DateTime UpdatedAtUtc
);

public record ActivitySummaryDto(
    string Period,
    DateTime StartUtc,
    DateTime EndUtc,
    int TotalSeconds,
    List<ActivityBucketDto> ByLabel,
    List<DomainGroupDto> DomainGroups,
    List<ActivitySessionDto> Unclassified,
    WebsiteMlStatusDto Model
);

public record ActivityBucketDto(
    string Key,
    string Label,
    int ActiveSeconds,
    string? Domain,
    string? Url,
    string ProductivityLabel,
    string LabelSource,
    float? PredictionConfidence,
    string? Title = null
);

public record DomainGroupDto(
    string Domain,
    int TotalSeconds,
    string ProductivityLabel,
    string LabelSource,
    float? PredictionConfidence,
    List<ActivityBucketDto> Urls
);

public class ActivityService(
    ProtocolDbContext db,
    WebsiteProductivityMlService mlService)
{
    private static readonly HashSet<string> ValidLabels = ["Productive", "Neutral", "Distracting"];
    private static readonly TimeZoneInfo Ist = GetIst();

    public async Task<ActivitySessionDto> HeartbeatAsync(ActivityHeartbeatRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SessionKey))
            throw new ArgumentException("Session key is required.");

        var url = NormalizeUrl(request.Url);
        if (string.IsNullOrWhiteSpace(url))
            throw new ArgumentException("Valid URL is required.");

        var domain = NormalizeDomain(request.Domain) ?? ExtractDomain(url);
        if (string.IsNullOrWhiteSpace(domain))
            throw new ArgumentException("Valid domain is required.");

        var observedAt = NormalizeUtc(request.ObservedAtUtc) ?? DateTime.UtcNow;
        var startedAt = NormalizeUtc(request.StartedAtUtc) ?? observedAt;
        var seconds = Math.Clamp(request.ActiveSeconds, 1, 300);

        var sessionKey = request.SessionKey.Trim();
        var session = await db.WebsiteVisitSessions
            .FirstOrDefaultAsync(s => s.SessionKey == sessionKey);

        var classification = await ClassifyAsync(domain, url, TrimToNull(request.Title));

        if (session is null)
        {
            session = new WebsiteVisitSession
            {
                SessionKey = sessionKey,
                Url = url,
                Domain = domain,
                Title = TrimToNull(request.Title),
                StartedAtUtc = startedAt,
                LastSeenAtUtc = observedAt,
                ActiveSeconds = seconds,
                SourceBrowser = TrimToNull(request.SourceBrowser),
                ProductivityLabel = classification.Label,
                LabelSource = classification.Source,
                PredictionConfidence = classification.Confidence,
                PredictedAtUtc = classification.Source == "ml" ? DateTime.UtcNow : null
            };
            db.WebsiteVisitSessions.Add(session);
        }
        else
        {
            session.Url = url;
            session.Domain = domain;
            session.Title = TrimToNull(request.Title) ?? session.Title;
            session.LastSeenAtUtc = observedAt > session.LastSeenAtUtc ? observedAt : session.LastSeenAtUtc;
            session.EndedAtUtc = null;
            session.ActiveSeconds += seconds;
            session.SourceBrowser = TrimToNull(request.SourceBrowser) ?? session.SourceBrowser;
            session.ProductivityLabel = classification.Label;
            session.LabelSource = classification.Source;
            session.PredictionConfidence = classification.Confidence;
            session.PredictedAtUtc = classification.Source == "ml" ? DateTime.UtcNow : session.PredictedAtUtc;
        }

        await db.SaveChangesAsync();
        return ToDto(session);
    }

    public async Task<bool> FinalizeAsync(ActivityFinalizeRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.SessionKey))
            throw new ArgumentException("Session key is required.");

        var session = await db.WebsiteVisitSessions
            .FirstOrDefaultAsync(s => s.SessionKey == request.SessionKey.Trim());

        if (session is null) return false;

        var endedAt = NormalizeUtc(request.EndedAtUtc) ?? DateTime.UtcNow;
        session.EndedAtUtc = endedAt;
        if (endedAt > session.LastSeenAtUtc)
            session.LastSeenAtUtc = endedAt;

        await db.SaveChangesAsync();
        return true;
    }

    public async Task<ActivitySummaryDto> GetSummaryAsync(string? period)
    {
        var normalizedPeriod = string.Equals(period, "today", StringComparison.OrdinalIgnoreCase)
            ? "today"
            : "week";
        var (startUtc, endUtc) = GetRange(normalizedPeriod);

        var sessions = await db.WebsiteVisitSessions
            .Where(s => s.StartedAtUtc >= startUtc && s.StartedAtUtc < endUtc)
            .OrderByDescending(s => s.ActiveSeconds)
            .ToListAsync();

        var byLabel = sessions
            .GroupBy(s => s.ProductivityLabel)
            .Select(g => new ActivityBucketDto(
                g.Key,
                g.Key,
                g.Sum(s => s.ActiveSeconds),
                null,
                null,
                g.Key,
                g.Select(s => s.LabelSource).OrderByDescending(PrioritySource).FirstOrDefault() ?? "unclassified",
                null))
            .OrderByDescending(b => b.ActiveSeconds)
            .ToList();

        var domainGroups = sessions
            .GroupBy(s => s.Domain)
            .Select(g =>
            {
                var domainTop = g.OrderByDescending(s => s.ActiveSeconds).First();
                var urlBuckets = g
                    .GroupBy(s => s.Url)
                    .Select(ug =>
                    {
                        var urlTop = ug.OrderByDescending(s => s.ActiveSeconds).First();
                        return new ActivityBucketDto(
                            ug.Key,
                            urlTop.Title ?? ug.Key,
                            ug.Sum(s => s.ActiveSeconds),
                            g.Key,
                            ug.Key,
                            urlTop.ProductivityLabel,
                            urlTop.LabelSource,
                            urlTop.PredictionConfidence,
                            urlTop.Title);
                    })
                    .OrderByDescending(b => b.ActiveSeconds)
                    .ToList();

                return new DomainGroupDto(
                    g.Key,
                    g.Sum(s => s.ActiveSeconds),
                    domainTop.ProductivityLabel,
                    domainTop.LabelSource,
                    domainTop.PredictionConfidence,
                    urlBuckets);
            })
            .OrderByDescending(d => d.TotalSeconds)
            .ToList();

        var unclassified = sessions
            .Where(s => s.ProductivityLabel == "Unclassified")
            .OrderByDescending(s => s.ActiveSeconds)
            .Take(20)
            .Select(ToDto)
            .ToList();

        return new ActivitySummaryDto(
            normalizedPeriod,
            startUtc,
            endUtc,
            sessions.Sum(s => s.ActiveSeconds),
            byLabel,
            domainGroups,
            unclassified,
            await mlService.GetStatusAsync()
        );
    }

    public async Task<List<ActivityLabelDto>> GetLabelsAsync()
    {
        var labels = await db.WebsiteProductivityLabels
            .OrderBy(l => l.Domain)
            .ThenBy(l => l.Scope)
            .ThenBy(l => l.Target)
            .ToListAsync();

        return labels.Select(ToDto).ToList();
    }

    public async Task<ActivityLabelDto> UpsertLabelAsync(ActivityLabelRequest request)
    {
        var label = NormalizeLabel(request.Label);
        var scope = string.Equals(request.Scope, "domain", StringComparison.OrdinalIgnoreCase)
            ? "domain"
            : "url";

        var url = scope == "url" ? NormalizeUrl(request.Url ?? request.Target) : null;
        var domain = NormalizeDomain(request.Domain)
            ?? (url is not null ? ExtractDomain(url) : NormalizeDomain(request.Target));

        if (string.IsNullOrWhiteSpace(domain))
            throw new ArgumentException("Domain is required.");

        var target = scope == "domain"
            ? domain
            : url ?? throw new ArgumentException("URL is required for URL labels.");

        var existing = await db.WebsiteProductivityLabels
            .FirstOrDefaultAsync(l => l.Scope == scope && l.Target == target);

        if (existing is null)
        {
            existing = new WebsiteProductivityLabel
            {
                Scope = scope,
                Target = target,
                Domain = domain,
                Url = scope == "url" ? target : null,
                Label = label
            };
            db.WebsiteProductivityLabels.Add(existing);
        }
        else
        {
            existing.Domain = domain;
            existing.Url = scope == "url" ? target : null;
            existing.Label = label;
            existing.UpdatedAtUtc = DateTime.UtcNow;
        }

        await ApplyManualLabelAsync(scope, target, domain, label);
        await db.SaveChangesAsync();
        return ToDto(existing);
    }

    public async Task<int> ApplyPredictionsAsync()
    {
        var sessions = await db.WebsiteVisitSessions
            .Where(s => s.LabelSource != "manual")
            .ToListAsync();

        var changed = 0;
        foreach (var session in sessions)
        {
            var classification = await ClassifyAsync(session.Domain, session.Url, session.Title);
            session.ProductivityLabel = classification.Label;
            session.LabelSource = classification.Source;
            session.PredictionConfidence = classification.Confidence;
            session.PredictedAtUtc = classification.Source == "ml" ? DateTime.UtcNow : session.PredictedAtUtc;
            changed++;
        }

        await db.SaveChangesAsync();
        return changed;
    }

    private async Task<(string Label, string Source, float? Confidence)> ClassifyAsync(string domain, string url, string? title = null)
    {
        var manualUrl = await db.WebsiteProductivityLabels
            .FirstOrDefaultAsync(l => l.Scope == "url" && l.Target == url);
        if (manualUrl is not null) return (manualUrl.Label, "manual", null);

        var manualDomain = await db.WebsiteProductivityLabels
            .FirstOrDefaultAsync(l => l.Scope == "domain" && l.Target == domain);
        if (manualDomain is not null) return (manualDomain.Label, "manual", null);

        var prediction = mlService.Predict(domain, url, title);
        return prediction is null
            ? ("Unclassified", "unclassified", null)
            : (prediction.Label, "ml", prediction.Confidence);
    }

    private async Task ApplyManualLabelAsync(string scope, string target, string domain, string label)
    {
        var sessions = scope == "domain"
            ? await db.WebsiteVisitSessions.Where(s => s.Domain == domain).ToListAsync()
            : await db.WebsiteVisitSessions.Where(s => s.Url == target).ToListAsync();

        foreach (var session in sessions)
        {
            session.ProductivityLabel = label;
            session.LabelSource = "manual";
            session.PredictionConfidence = null;
        }
    }

    public static string? NormalizeUrl(string? rawUrl)
    {
        if (string.IsNullOrWhiteSpace(rawUrl)) return null;
        if (!Uri.TryCreate(rawUrl.Trim(), UriKind.Absolute, out var uri)) return null;
        if (uri.Scheme is not ("http" or "https")) return null;

        var builder = new UriBuilder(uri.Scheme, uri.Host, uri.IsDefaultPort ? -1 : uri.Port, uri.AbsolutePath)
        {
            Query = uri.Query.TrimStart('?')
        };
        return builder.Uri.ToString();
    }

    private static string? NormalizeDomain(string? rawDomain)
    {
        if (string.IsNullOrWhiteSpace(rawDomain)) return null;
        var domain = rawDomain.Trim().ToLowerInvariant();
        if (domain.StartsWith("www.", StringComparison.Ordinal)) domain = domain[4..];
        return domain;
    }

    private static string ExtractDomain(string url)
    {
        var uri = new Uri(url);
        return NormalizeDomain(uri.Host) ?? uri.Host.ToLowerInvariant();
    }

    private static string NormalizeLabel(string? label)
    {
        var normalized = ValidLabels.FirstOrDefault(l =>
            string.Equals(l, label, StringComparison.OrdinalIgnoreCase));
        if (normalized is null)
            throw new ArgumentException("Label must be Productive, Neutral, or Distracting.");

        return normalized;
    }

    private static DateTime? NormalizeUtc(DateTime? value)
    {
        if (value is null) return null;
        return value.Value.Kind switch
        {
            DateTimeKind.Utc => value.Value,
            DateTimeKind.Local => value.Value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value.Value, DateTimeKind.Utc)
        };
    }

    private static (DateTime StartUtc, DateTime EndUtc) GetRange(string period)
    {
        var nowIst = TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, Ist);
        var startIst = period == "today"
            ? nowIst.Date
            : nowIst.Date.AddDays(-6);
        var endIst = nowIst.Date.AddDays(1);

        return (
            TimeZoneInfo.ConvertTimeToUtc(startIst, Ist),
            TimeZoneInfo.ConvertTimeToUtc(endIst, Ist)
        );
    }

    private static TimeZoneInfo GetIst()
    {
        try { return TimeZoneInfo.FindSystemTimeZoneById("India Standard Time"); }
        catch { return TimeZoneInfo.FindSystemTimeZoneById("Asia/Kolkata"); }
    }

    private static int PrioritySource(string source) => source switch
    {
        "manual" => 3,
        "ml" => 2,
        _ => 1
    };

    private static string? TrimToNull(string? value) =>
        string.IsNullOrWhiteSpace(value) ? null : value.Trim();

    private static ActivitySessionDto ToDto(WebsiteVisitSession s) => new(
        s.Id,
        s.SessionKey,
        s.Url,
        s.Domain,
        s.Title,
        s.StartedAtUtc,
        s.LastSeenAtUtc,
        s.EndedAtUtc,
        s.ActiveSeconds,
        s.ProductivityLabel,
        s.LabelSource,
        s.PredictionConfidence
    );

    private static ActivityLabelDto ToDto(WebsiteProductivityLabel l) => new(
        l.Id,
        l.Scope,
        l.Target,
        l.Domain,
        l.Url,
        l.Label,
        l.UpdatedAtUtc
    );
}
