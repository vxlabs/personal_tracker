using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Hosting.Server;
using Microsoft.AspNetCore.Hosting.Server.Features;
using Protocol.Api.Data;
using Protocol.Api.Services;

var builder = WebApplication.CreateBuilder(args);
if (OperatingSystem.IsWindows() && Microsoft.Extensions.Hosting.WindowsServices.WindowsServiceHelpers.IsWindowsService())
{
    builder.Host.UseWindowsService(); // Allows running as a Windows Service
}
else
{
    builder.Logging.ClearProviders();
    builder.Logging.AddConsole();
    builder.Logging.AddDebug();
}

var configuredPort = Environment.GetEnvironmentVariable("PROTOCOL_PORT");
if (!string.IsNullOrWhiteSpace(configuredPort))
{
    builder.WebHost.UseUrls($"http://127.0.0.1:{configuredPort}");
}

var dataDir = Environment.GetEnvironmentVariable("PROTOCOL_DATA_DIR");
var vaultDir = Environment.GetEnvironmentVariable("PROTOCOL_VAULT_DIR")
    ?? Path.Combine(
        Environment.GetFolderPath(Environment.SpecialFolder.MyDocuments),
        "Protocol-Vault");

Directory.CreateDirectory(vaultDir);
builder.Configuration["Protocol:VaultDirectory"] = vaultDir;

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext — always store the DB outside the project tree to prevent
// personal data from being accidentally committed to git.
var defaultDataDir = Path.Combine(
    Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
    "Protocol", "data");
var effectiveDataDir = string.IsNullOrWhiteSpace(dataDir) ? defaultDataDir : dataDir;

builder.Services.AddDbContext<ProtocolDbContext>(options =>
{
    Directory.CreateDirectory(effectiveDataDir);
    var dbPath = Path.Combine(effectiveDataDir, "protocol.db");
    options.UseSqlite($"Data Source={dbPath}");
});

// Services
builder.Services.AddScoped<ScheduleService>();
builder.Services.AddScoped<HabitService>();
builder.Services.AddScoped<FocusService>();
builder.Services.AddScoped<DailyReviewService>();
builder.Services.AddScoped<WeeklyReportService>();
builder.Services.AddScoped<XpService>();
builder.Services.AddScoped<NotificationService>();
builder.Services.AddHostedService<NotificationBackgroundService>();
builder.Services.AddSingleton<VaultInitService>();
builder.Services.AddSingleton<VaultFileWatcher>();
builder.Services.AddScoped<ContentExtractorService>();
builder.Services.AddScoped<WikiSearchService>();
builder.Services.AddScoped<WikiAgentService>();
builder.Services.AddScoped<WikiCompileService>();
builder.Services.AddScoped<WebsiteProductivityMlService>();
builder.Services.AddScoped<ActivityService>();
builder.Services.AddScoped<AppCategoryMlService>();
builder.Services.AddScoped<AppActivityService>();
builder.Services.AddSingleton<DesktopActivityCaptureState>();
builder.Services.AddHostedService<DesktopActivityHostedService>();

builder.Services.AddHttpClient("extractor", client =>
{
    client.DefaultRequestHeaders.Add("User-Agent",
        "Mozilla/5.0 (compatible; ProtocolBot/1.0)");
    client.Timeout = TimeSpan.FromSeconds(30);
});

// CORS — allow frontend dev server and Chrome extension
builder.Services.AddCors(options =>
{
    options.AddPolicy("DevFrontend", policy =>
    {
        policy.SetIsOriginAllowed(origin =>
                  origin == "http://localhost:5173" ||
                  origin.StartsWith("chrome-extension://") ||
                  origin.StartsWith("moz-extension://"))
              .AllowAnyHeader()
              .AllowAnyMethod();
    });

    // Production: single-user personal app, no auth — allow all origins
    options.AddPolicy("Production", policy =>
    {
        policy.SetIsOriginAllowed(_ => true)
              .AllowAnyHeader()
              .AllowAnyMethod();
    });
});

var app = builder.Build();
var startTime = DateTime.UtcNow;

// Auto-migrate and seed on startup
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<ProtocolDbContext>();

    // Ensure data directory exists
    var dbPath = Path.GetDirectoryName(db.Database.GetDbConnection().DataSource);
    if (!string.IsNullOrEmpty(dbPath))
        Directory.CreateDirectory(dbPath);

    db.Database.Migrate();
    WebsiteActivitySchemaRepair.EnsureCreated(db);
    AppActivitySchemaRepair.EnsureCreated(db);
    DatabaseSeeder.Seed(db);
}

// Initialize vault directory structure and starter files
var vaultInit = app.Services.GetRequiredService<VaultInitService>();
vaultInit.Initialize();

// Start the file watcher for Claude Code sync
var fileWatcher = app.Services.GetRequiredService<VaultFileWatcher>();
fileWatcher.Start();

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseCors(app.Environment.IsDevelopment() ? "DevFrontend" : "Production");
app.MapControllers();

app.MapGet("/api/health", () => new
{
    status = "ok",
    app = "Protocol",
    time = DateTime.UtcNow,
    uptimeSeconds = Math.Round((DateTime.UtcNow - startTime).TotalSeconds, 1),
});

await app.StartAsync();

var server = app.Services.GetRequiredService<IServer>();
var addresses = server.Features.Get<IServerAddressesFeature>();
var actualAddress = addresses?.Addresses.FirstOrDefault();

if (actualAddress is not null)
{
    var actualPort = new Uri(actualAddress).Port;
    Console.WriteLine($"PROTOCOL_API_READY:{actualPort}");
}

await app.WaitForShutdownAsync();
