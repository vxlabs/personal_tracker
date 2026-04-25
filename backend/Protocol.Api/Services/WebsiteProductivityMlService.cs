using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record WebsiteMlPrediction(string Label, float Confidence);

public record WebsiteMlStatusDto(
    bool HasModel,
    string? ModelPath,
    DateTime? LastTrainedAtUtc,
    bool LastTrainingSucceeded,
    string? LastTrainingMessage,
    Dictionary<string, int> LabelCounts
);

public record WebsiteMlTrainResult(
    bool Succeeded,
    string Message,
    int ProductiveCount,
    int NeutralCount,
    int DistractingCount,
    int TrainingExampleCount,
    DateTime StartedAtUtc,
    DateTime? CompletedAtUtc
);

public class WebsiteProductivityMlService(ProtocolDbContext db)
{
    private static readonly string[] RequiredLabels = ["Productive", "Neutral", "Distracting"];
    private readonly MLContext ml = new(seed: 11);
    private ITransformer? loadedModel;
    private PredictionEngine<WebsiteMlInput, WebsiteMlOutput>? predictionEngine;

    public async Task<WebsiteMlStatusDto> GetStatusAsync()
    {
        var modelPath = GetModelPath();
        var lastRun = await db.WebsiteMlTrainingRuns
            .OrderByDescending(r => r.StartedAtUtc)
            .FirstOrDefaultAsync();

        var counts = await GetLabelCountsAsync();

        return new WebsiteMlStatusDto(
            File.Exists(modelPath),
            modelPath,
            lastRun?.CompletedAtUtc,
            lastRun?.Succeeded ?? false,
            lastRun?.Message,
            counts
        );
    }

    public async Task<WebsiteMlTrainResult> TrainAsync()
    {
        var startedAt = DateTime.UtcNow;
        var counts = await GetLabelCountsAsync();
        var productive = counts.GetValueOrDefault("Productive");
        var neutral = counts.GetValueOrDefault("Neutral");
        var distracting = counts.GetValueOrDefault("Distracting");

        var run = new WebsiteMlTrainingRun
        {
            StartedAtUtc = startedAt,
            ProductiveCount = productive,
            NeutralCount = neutral,
            DistractingCount = distracting,
            TrainingExampleCount = counts.Values.Sum()
        };

        var missing = RequiredLabels
            .Where(label => counts.GetValueOrDefault(label) < 3)
            .ToList();

        if (missing.Count > 0)
        {
            run.Succeeded = false;
            run.CompletedAtUtc = DateTime.UtcNow;
            run.Message = "Needs at least 3 manual examples for each label: Productive, Neutral, Distracting.";
            db.WebsiteMlTrainingRuns.Add(run);
            await db.SaveChangesAsync();
            return ToResult(run);
        }

        var labels = await db.WebsiteProductivityLabels
            .Where(l => RequiredLabels.Contains(l.Label))
            .ToListAsync();

        // Build title lookups from stored sessions to enrich training data
        var sessionTitleData = await db.WebsiteVisitSessions
            .Where(s => s.Title != null)
            .Select(s => new { s.Url, s.Domain, s.Title, s.LastSeenAtUtc })
            .ToListAsync();

        var titleByUrl = sessionTitleData
            .GroupBy(s => s.Url)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.LastSeenAtUtc).First().Title ?? string.Empty);

        var titleByDomain = sessionTitleData
            .GroupBy(s => s.Domain)
            .ToDictionary(g => g.Key, g => g.OrderByDescending(s => s.LastSeenAtUtc).First().Title ?? string.Empty);

        var examples = labels.Select(l =>
        {
            var targetUrl = l.Scope == "domain" ? l.Domain : l.Url ?? l.Target;
            var title = l.Scope == "domain"
                ? titleByDomain.GetValueOrDefault(l.Domain, string.Empty)
                : titleByUrl.GetValueOrDefault(targetUrl, string.Empty);
            return new WebsiteMlInput
            {
                Label = l.Label,
                Domain = l.Domain,
                Url = targetUrl,
                Title = title
            };
        }).ToList();

        var data = ml.Data.LoadFromEnumerable(examples);
        var pipeline = ml.Transforms.Text.FeaturizeText("DomainFeatures", nameof(WebsiteMlInput.Domain))
            .Append(ml.Transforms.Text.FeaturizeText("UrlFeatures", nameof(WebsiteMlInput.Url)))
            .Append(ml.Transforms.Text.FeaturizeText("TitleFeatures", nameof(WebsiteMlInput.Title)))
            .Append(ml.Transforms.Concatenate("Features", "DomainFeatures", "UrlFeatures", "TitleFeatures"))
            .Append(ml.Transforms.Conversion.MapValueToKey("LabelKey", nameof(WebsiteMlInput.Label)))
            .Append(ml.MulticlassClassification.Trainers.SdcaMaximumEntropy("LabelKey", "Features"))
            .Append(ml.Transforms.Conversion.MapKeyToValue(nameof(WebsiteMlOutput.PredictedLabel), "PredictedLabel"));

        var model = pipeline.Fit(data);
        var modelPath = GetModelPath();
        Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
        ml.Model.Save(model, data.Schema, modelPath);

        loadedModel = model;
        predictionEngine = ml.Model.CreatePredictionEngine<WebsiteMlInput, WebsiteMlOutput>(loadedModel);

        run.Succeeded = true;
        run.CompletedAtUtc = DateTime.UtcNow;
        run.Message = "Model trained successfully.";
        run.ModelPath = modelPath;
        db.WebsiteMlTrainingRuns.Add(run);
        await db.SaveChangesAsync();

        return ToResult(run);
    }

    public WebsiteMlPrediction? Predict(string domain, string url, string? title = null)
    {
        var modelPath = GetModelPath();
        if (!File.Exists(modelPath)) return null;

        try
        {
            if (predictionEngine is null)
            {
                loadedModel = ml.Model.Load(modelPath, out _);
                predictionEngine = ml.Model.CreatePredictionEngine<WebsiteMlInput, WebsiteMlOutput>(loadedModel);
            }

            var output = predictionEngine.Predict(new WebsiteMlInput { Domain = domain, Url = url, Title = title ?? string.Empty });
            if (string.IsNullOrWhiteSpace(output.PredictedLabel)) return null;

            var confidence = output.Score is { Length: > 0 }
                ? Math.Clamp(output.Score.Max(), 0f, 1f)
                : 0f;

            return new WebsiteMlPrediction(output.PredictedLabel, confidence);
        }
        catch
        {
            // Model schema mismatch (e.g. old model trained without Title feature) — invalidate and return null
            loadedModel = null;
            predictionEngine = null;
            return null;
        }
    }

    private async Task<Dictionary<string, int>> GetLabelCountsAsync()
    {
        var counts = await db.WebsiteProductivityLabels
            .GroupBy(l => l.Label)
            .Select(g => new { Label = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Label, x => x.Count);

        foreach (var label in RequiredLabels)
            counts.TryAdd(label, 0);

        return counts;
    }

    private static WebsiteMlTrainResult ToResult(WebsiteMlTrainingRun run) => new(
        run.Succeeded,
        run.Message,
        run.ProductiveCount,
        run.NeutralCount,
        run.DistractingCount,
        run.TrainingExampleCount,
        run.StartedAtUtc,
        run.CompletedAtUtc
    );

    private static string GetModelPath()
    {
        var dataDir = Environment.GetEnvironmentVariable("PROTOCOL_DATA_DIR");
        if (string.IsNullOrWhiteSpace(dataDir))
            dataDir = Path.Combine(AppContext.BaseDirectory, "Data");

        return Path.Combine(dataDir, "ml", "website-productivity.zip");
    }

    private sealed class WebsiteMlInput
    {
        public string Label { get; set; } = string.Empty;
        public string Domain { get; set; } = string.Empty;
        public string Url { get; set; } = string.Empty;
        public string Title { get; set; } = string.Empty;
    }

    private sealed class WebsiteMlOutput
    {
        public string PredictedLabel { get; set; } = string.Empty;
        public float[] Score { get; set; } = [];
    }
}
