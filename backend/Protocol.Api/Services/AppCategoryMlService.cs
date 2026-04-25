using Microsoft.EntityFrameworkCore;
using Microsoft.ML;
using Protocol.Api.Data;
using Protocol.Api.Models;

namespace Protocol.Api.Services;

public record AppMlPrediction(string Label, float Confidence);

public record AppMlStatusDto(
    bool HasModel,
    string? ModelPath,
    DateTime? LastTrainedAtUtc,
    bool LastTrainingSucceeded,
    string? LastTrainingMessage,
    Dictionary<string, int> LabelCounts,
    int MinExamplesRequired
);

public record AppMlTrainResultDto(
    bool Succeeded,
    string Message,
    int TrainingExampleCount,
    DateTime StartedAtUtc,
    DateTime? CompletedAtUtc
);

public class AppCategoryMlService(ProtocolDbContext db)
{
    private const int MinExamplesPerLabel = 2;

    private readonly MLContext ml = new(seed: 42);
    private ITransformer? loadedModel;
    private PredictionEngine<AppMlInput, AppMlOutput>? predictionEngine;

    public async Task<AppMlStatusDto> GetStatusAsync()
    {
        var modelPath = GetModelPath();
        var lastRun = await db.AppMlTrainingRuns
            .OrderByDescending(r => r.StartedAtUtc)
            .FirstOrDefaultAsync();

        var counts = await GetLabelCountsAsync();

        return new AppMlStatusDto(
            File.Exists(modelPath),
            modelPath,
            lastRun?.CompletedAtUtc,
            lastRun?.Succeeded ?? false,
            lastRun?.Message,
            counts,
            MinExamplesPerLabel
        );
    }

    public async Task<AppMlTrainResultDto> TrainAsync()
    {
        var startedAt = DateTime.UtcNow;
        var counts = await GetLabelCountsAsync();

        var run = new AppMlTrainingRun
        {
            StartedAtUtc = startedAt,
            TrainingExampleCount = counts.Values.Sum()
        };

        // Need at least 2 categories with MinExamplesPerLabel examples each
        var validLabels = counts
            .Where(kv => kv.Value >= MinExamplesPerLabel)
            .Select(kv => kv.Key)
            .ToList();

        if (validLabels.Count < 2)
        {
            run.Succeeded = false;
            run.CompletedAtUtc = DateTime.UtcNow;
            run.Message = $"Needs at least {MinExamplesPerLabel} manual examples in at least 2 different categories to train.";
            db.AppMlTrainingRuns.Add(run);
            await db.SaveChangesAsync();
            return ToResult(run);
        }

        var labels = await db.AppCategoryLabels.ToListAsync();

        // Enrich with window title data from sessions
        var sessionTitleData = await db.AppUsageSessions
            .Where(s => s.WindowTitle != null)
            .Select(s => new { s.ProcessName, s.WindowTitle, s.LastSeenAtUtc })
            .ToListAsync();

        var titleByProcess = sessionTitleData
            .GroupBy(s => s.ProcessName, StringComparer.OrdinalIgnoreCase)
            .ToDictionary(
                g => g.Key,
                g => g.OrderByDescending(s => s.LastSeenAtUtc).First().WindowTitle ?? string.Empty,
                StringComparer.OrdinalIgnoreCase);

        var examples = labels
            .Where(l => validLabels.Contains(l.Label))
            .Select(l => new AppMlInput
            {
                Label = l.Label,
                ProcessName = l.ProcessName,
                WindowTitle = titleByProcess.GetValueOrDefault(l.ProcessName, string.Empty)
            })
            .ToList();

        var data = ml.Data.LoadFromEnumerable(examples);
        var pipeline = ml.Transforms.Text.FeaturizeText("ProcessFeatures", nameof(AppMlInput.ProcessName))
            .Append(ml.Transforms.Text.FeaturizeText("TitleFeatures", nameof(AppMlInput.WindowTitle)))
            .Append(ml.Transforms.Concatenate("Features", "ProcessFeatures", "TitleFeatures"))
            .Append(ml.Transforms.Conversion.MapValueToKey("LabelKey", nameof(AppMlInput.Label)))
            .Append(ml.MulticlassClassification.Trainers.SdcaMaximumEntropy("LabelKey", "Features"))
            .Append(ml.Transforms.Conversion.MapKeyToValue(nameof(AppMlOutput.PredictedLabel), "PredictedLabel"));

        var model = pipeline.Fit(data);
        var modelPath = GetModelPath();
        Directory.CreateDirectory(Path.GetDirectoryName(modelPath)!);
        ml.Model.Save(model, data.Schema, modelPath);

        loadedModel = model;
        predictionEngine = ml.Model.CreatePredictionEngine<AppMlInput, AppMlOutput>(loadedModel);

        run.Succeeded = true;
        run.CompletedAtUtc = DateTime.UtcNow;
        run.Message = $"Model trained on {examples.Count} examples across {validLabels.Count} categories.";
        run.ModelPath = modelPath;
        db.AppMlTrainingRuns.Add(run);
        await db.SaveChangesAsync();

        return ToResult(run);
    }

    public AppMlPrediction? Predict(string processName, string? windowTitle)
    {
        var modelPath = GetModelPath();
        if (!File.Exists(modelPath)) return null;

        try
        {
            if (predictionEngine is null)
            {
                loadedModel = ml.Model.Load(modelPath, out _);
                predictionEngine = ml.Model.CreatePredictionEngine<AppMlInput, AppMlOutput>(loadedModel);
            }

            var output = predictionEngine.Predict(new AppMlInput
            {
                ProcessName = processName,
                WindowTitle = windowTitle ?? string.Empty
            });

            if (string.IsNullOrWhiteSpace(output.PredictedLabel)) return null;

            var confidence = output.Score is { Length: > 0 }
                ? Math.Clamp(output.Score.Max(), 0f, 1f)
                : 0f;

            return new AppMlPrediction(output.PredictedLabel, confidence);
        }
        catch
        {
            loadedModel = null;
            predictionEngine = null;
            return null;
        }
    }

    public async Task<Dictionary<string, int>> GetLabelCountsAsync()
    {
        return await db.AppCategoryLabels
            .GroupBy(l => l.Label)
            .Select(g => new { Label = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Label, x => x.Count);
    }

    private static AppMlTrainResultDto ToResult(AppMlTrainingRun run) => new(
        run.Succeeded,
        run.Message,
        run.TrainingExampleCount,
        run.StartedAtUtc,
        run.CompletedAtUtc
    );

    private static string GetModelPath()
    {
        var dataDir = Environment.GetEnvironmentVariable("PROTOCOL_DATA_DIR");
        if (string.IsNullOrWhiteSpace(dataDir))
            dataDir = Path.Combine(AppContext.BaseDirectory, "Data");

        return Path.Combine(dataDir, "ml", "app-category.zip");
    }

    private sealed class AppMlInput
    {
        public string Label { get; set; } = string.Empty;
        public string ProcessName { get; set; } = string.Empty;
        public string WindowTitle { get; set; } = string.Empty;
    }

    private sealed class AppMlOutput
    {
        public string PredictedLabel { get; set; } = string.Empty;
        public float[] Score { get; set; } = [];
    }
}
