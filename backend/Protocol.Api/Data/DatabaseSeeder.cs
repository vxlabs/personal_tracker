using Protocol.Api.Models;

namespace Protocol.Api.Data;

public static class DatabaseSeeder
{
    public static void Seed(ProtocolDbContext db)
    {
        SeedTimeBlocks(db);
        SeedHabits(db);
        SeedBlockedSites(db);
        db.SaveChanges();
    }

    private static void SeedTimeBlocks(ProtocolDbContext db)
    {
        if (db.TimeBlocks.Any()) return;

        var blocks = new List<TimeBlock>
        {
            // Monday – sample weekday
            Block(DayOfWeek.Monday, "06:00", "06:30", "routine", "Morning Routine", null, false, 0),
            Block(DayOfWeek.Monday, "06:30", "07:30", "exercise", "Exercise", null, false, 1),
            Block(DayOfWeek.Monday, "07:30", "08:00", "rest", "Breakfast", null, false, 2),
            Block(DayOfWeek.Monday, "08:00", "10:00", "deep", "Deep Work Block 1", "Phone on DND", true, 3),
            Block(DayOfWeek.Monday, "10:00", "10:15", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Monday, "10:15", "12:30", "deep", "Deep Work Block 2", null, true, 5),
            Block(DayOfWeek.Monday, "12:30", "13:30", "rest", "Lunch", null, false, 6),
            Block(DayOfWeek.Monday, "13:30", "14:30", "reading", "Reading", null, true, 7),
            Block(DayOfWeek.Monday, "14:30", "18:30", "work", "Work", null, true, 8),
            Block(DayOfWeek.Monday, "18:30", "19:00", "rest", "Dinner + Wind Down", null, false, 9),

            // Saturday – sample weekend
            Block(DayOfWeek.Saturday, "08:00", "09:00", "exercise", "Exercise", null, false, 0),
            Block(DayOfWeek.Saturday, "09:00", "09:30", "rest", "Breakfast", null, false, 1),
            Block(DayOfWeek.Saturday, "09:30", "12:00", "deep", "Side Projects", null, true, 2),
            Block(DayOfWeek.Saturday, "12:00", "13:00", "rest", "Lunch", null, false, 3),
            Block(DayOfWeek.Saturday, "13:00", "14:00", "reading", "Reading", null, false, 4),
            Block(DayOfWeek.Saturday, "14:00", "23:00", "off", "Free Time", null, false, 5),

            // Sunday – rest day
            Block(DayOfWeek.Sunday, "08:00", "23:00", "off", "Rest Day", null, false, 0),
        };

        db.TimeBlocks.AddRange(blocks);
    }

    private static void SeedHabits(ProtocolDbContext db)
    {
        if (db.HabitDefinitions.Any()) return;

        // ApplicableDays bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
        // 0 = every day; Weekdays (Mon-Fri) = 62
        db.HabitDefinitions.AddRange(
            new HabitDefinition { Key = "drink_water",   Label = "Drink 8 glasses of water",  Icon = "💧", ApplicableDays = 0  },
            new HabitDefinition { Key = "no_phone",      Label = "No phone first hour",       Icon = "📵", ApplicableDays = 0  },
            new HabitDefinition { Key = "exercise",      Label = "30 min exercise",           Icon = "🏃", ApplicableDays = 62 },
            new HabitDefinition { Key = "read_30",       Label = "Read for 30 minutes",       Icon = "📖", ApplicableDays = 62 },
            new HabitDefinition { Key = "sleep_early",   Label = "Lights out by 11 PM",       Icon = "🌙", ApplicableDays = 0  },
            new HabitDefinition { Key = "day_review",    Label = "End-of-day review",         Icon = "📝", ApplicableDays = 62 }
        );
    }

    private static void SeedBlockedSites(ProtocolDbContext db)
    {
        if (db.BlockedSites.Any()) return;

        var domains = new[]
        {
            "instagram.com", "facebook.com", "twitter.com", "x.com",
            "reddit.com", "youtube.com", "netflix.com", "primevideo.com", "hotstar.com"
        };

        db.BlockedSites.AddRange(domains.Select(d => new BlockedSite { Domain = d, IsActive = true }));
    }

    private static TimeBlock Block(
        DayOfWeek day, string start, string end,
        string type, string label, string? note,
        bool isFocus, int order) => new()
    {
        DayOfWeek = day,
        StartTime = TimeSpan.Parse(start),
        EndTime = TimeSpan.Parse(end),
        Type = type,
        Label = label,
        Note = note,
        IsFocusBlock = isFocus,
        SortOrder = order
    };
}
