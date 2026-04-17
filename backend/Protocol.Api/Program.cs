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

// DbContext
builder.Services.AddDbContext<ProtocolDbContext>(options =>
{
    if (!string.IsNullOrWhiteSpace(dataDir))
    {
        Directory.CreateDirectory(dataDir);
        var dbPath = Path.Combine(dataDir, "protocol.db");
        options.UseSqlite($"Data Source={dbPath}");
        return;
    }

    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection"));
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
    DatabaseSeeder.Seed(db);
}

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
