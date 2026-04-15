using Microsoft.EntityFrameworkCore;
using Protocol.Api.Models;

namespace Protocol.Api.Data;

public class ProtocolDbContext(DbContextOptions<ProtocolDbContext> options) : DbContext(options)
{
    public DbSet<TimeBlock> TimeBlocks => Set<TimeBlock>();
    public DbSet<HabitDefinition> HabitDefinitions => Set<HabitDefinition>();
    public DbSet<HabitLog> HabitLogs => Set<HabitLog>();
    public DbSet<DailyReview> DailyReviews => Set<DailyReview>();
    public DbSet<FocusSession> FocusSessions => Set<FocusSession>();
    public DbSet<BlockedSite> BlockedSites => Set<BlockedSite>();
    public DbSet<PushSubscription> PushSubscriptions => Set<PushSubscription>();
    public DbSet<NotificationPreference> NotificationPreferences => Set<NotificationPreference>();
    public DbSet<BlockedAttempt> BlockedAttempts => Set<BlockedAttempt>();
    public DbSet<XpLedgerEntry> XpLedgerEntries => Set<XpLedgerEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // TimeBlock: unique constraint per day + sort order
        modelBuilder.Entity<TimeBlock>()
            .HasIndex(t => new { t.DayOfWeek, t.SortOrder });

        // Store TimeSpan as string "HH:mm" in SQLite
        modelBuilder.Entity<TimeBlock>()
            .Property(t => t.StartTime)
            .HasConversion(
                v => v.ToString(@"hh\:mm"),
                v => TimeSpan.Parse(v));

        modelBuilder.Entity<TimeBlock>()
            .Property(t => t.EndTime)
            .HasConversion(
                v => v.ToString(@"hh\:mm"),
                v => TimeSpan.Parse(v));

        // HabitLog: one log per habit per date
        modelBuilder.Entity<HabitLog>()
            .HasIndex(h => new { h.HabitDefinitionId, h.Date })
            .IsUnique();

        modelBuilder.Entity<HabitLog>()
            .Property(h => h.Date)
            .HasConversion(
                v => v.ToString("yyyy-MM-dd"),
                v => DateOnly.Parse(v));

        // DailyReview: one review per date
        modelBuilder.Entity<DailyReview>()
            .HasIndex(d => d.Date)
            .IsUnique();

        modelBuilder.Entity<DailyReview>()
            .Property(d => d.Date)
            .HasConversion(
                v => v.ToString("yyyy-MM-dd"),
                v => DateOnly.Parse(v));

        // HabitDefinition: unique key
        modelBuilder.Entity<HabitDefinition>()
            .HasIndex(h => h.Key)
            .IsUnique();

        // BlockedSite: unique domain
        modelBuilder.Entity<BlockedSite>()
            .HasIndex(b => b.Domain)
            .IsUnique();

        modelBuilder.Entity<XpLedgerEntry>()
            .HasIndex(x => x.SourceKey)
            .IsUnique();
    }
}
