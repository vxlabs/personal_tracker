using Microsoft.EntityFrameworkCore;
using Protocol.Api.Data;
using Protocol.Api.Services;

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseWindowsService(); // Allows running as a Windows Service

// Add services to the container
builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

// DbContext
builder.Services.AddDbContext<ProtocolDbContext>(options =>
    options.UseSqlite(builder.Configuration.GetConnectionString("DefaultConnection")));

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

app.MapGet("/api/health", () => new { status = "ok", app = "Protocol", time = DateTime.UtcNow });

app.Run();
