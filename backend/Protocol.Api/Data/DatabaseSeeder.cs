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
            // Monday
            Block(DayOfWeek.Monday, "06:00", "06:30", "routine", "Morning Routine", "No phone. No screens.", false, 0),
            Block(DayOfWeek.Monday, "06:30", "07:30", "football", "Football", null, false, 1),
            Block(DayOfWeek.Monday, "07:30", "08:15", "rest", "Breakfast + IG", "Only IG window", false, 2),
            Block(DayOfWeek.Monday, "08:15", "10:15", "ml", "ML Study", "Active recall. Phone on DND", true, 3),
            Block(DayOfWeek.Monday, "10:15", "10:30", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Monday, "10:30", "12:30", "content", "Content Research", "Topics, scripting, planning", true, 5),
            Block(DayOfWeek.Monday, "12:30", "13:30", "rest", "Lunch + Walk", "No screens. Let brain process", false, 6),
            Block(DayOfWeek.Monday, "13:30", "14:30", "reading", "Reading Hour", "Close book → write 3 lines", true, 7),
            Block(DayOfWeek.Monday, "14:30", "22:30", "work", "Full-time Work", "Deep focus. 1 screen only", true, 8),
            Block(DayOfWeek.Monday, "22:30", "23:15", "rest", "Dinner + Show + Day Review", null, false, 9),

            // Tuesday
            Block(DayOfWeek.Tuesday, "06:00", "06:30", "routine", "Morning Routine", null, false, 0),
            Block(DayOfWeek.Tuesday, "06:30", "07:30", "gym", "Gym", null, false, 1),
            Block(DayOfWeek.Tuesday, "07:30", "08:15", "rest", "Breakfast + IG", null, false, 2),
            Block(DayOfWeek.Tuesday, "08:15", "11:30", "content", "Video Shoot", "Script → setup → record", true, 3),
            Block(DayOfWeek.Tuesday, "11:30", "11:45", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Tuesday, "11:45", "12:30", "ml", "ML Study", "Review yesterday's notes", true, 5),
            Block(DayOfWeek.Tuesday, "12:30", "13:30", "rest", "Lunch + Walk", null, false, 6),
            Block(DayOfWeek.Tuesday, "13:30", "14:30", "reading", "Reading Hour", null, true, 7),
            Block(DayOfWeek.Tuesday, "14:30", "22:30", "work", "Full-time Work", null, true, 8),
            Block(DayOfWeek.Tuesday, "22:30", "23:15", "rest", "Dinner + Show + Day Review", null, false, 9),

            // Wednesday
            Block(DayOfWeek.Wednesday, "06:00", "06:30", "routine", "Morning Routine", null, false, 0),
            Block(DayOfWeek.Wednesday, "06:30", "07:30", "football", "Football", null, false, 1),
            Block(DayOfWeek.Wednesday, "07:30", "08:15", "rest", "Breakfast + IG", null, false, 2),
            Block(DayOfWeek.Wednesday, "08:15", "10:15", "ml", "ML Study", "Deep session. New material", true, 3),
            Block(DayOfWeek.Wednesday, "10:15", "10:30", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Wednesday, "10:30", "12:30", "content", "Content Research", "Next shoot prep", true, 5),
            Block(DayOfWeek.Wednesday, "12:30", "13:30", "rest", "Lunch + Walk", null, false, 6),
            Block(DayOfWeek.Wednesday, "13:30", "14:30", "reading", "Reading Hour", null, true, 7),
            Block(DayOfWeek.Wednesday, "14:30", "22:30", "work", "Full-time Work", null, true, 8),
            Block(DayOfWeek.Wednesday, "22:30", "23:15", "rest", "Dinner + Show + Day Review", null, false, 9),

            // Thursday
            Block(DayOfWeek.Thursday, "06:00", "06:30", "routine", "Morning Routine", null, false, 0),
            Block(DayOfWeek.Thursday, "06:30", "07:30", "gym", "Gym", null, false, 1),
            Block(DayOfWeek.Thursday, "07:30", "08:15", "rest", "Breakfast + IG", null, false, 2),
            Block(DayOfWeek.Thursday, "08:15", "11:30", "content", "Video Shoot", "Batch record if possible", true, 3),
            Block(DayOfWeek.Thursday, "11:30", "11:45", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Thursday, "11:45", "12:30", "ml", "ML Study", "Practice problems / code", true, 5),
            Block(DayOfWeek.Thursday, "12:30", "13:30", "rest", "Lunch + Walk", null, false, 6),
            Block(DayOfWeek.Thursday, "13:30", "14:30", "reading", "Reading Hour", null, true, 7),
            Block(DayOfWeek.Thursday, "14:30", "22:30", "work", "Full-time Work", null, true, 8),
            Block(DayOfWeek.Thursday, "22:30", "23:15", "rest", "Dinner + Show + Day Review", null, false, 9),

            // Friday
            Block(DayOfWeek.Friday, "06:00", "06:30", "routine", "Morning Routine", null, false, 0),
            Block(DayOfWeek.Friday, "06:30", "07:30", "football", "Football", null, false, 1),
            Block(DayOfWeek.Friday, "07:30", "08:15", "rest", "Breakfast + IG", null, false, 2),
            Block(DayOfWeek.Friday, "08:15", "11:00", "content", "Video Shoot", "Week's final shoot", true, 3),
            Block(DayOfWeek.Friday, "11:00", "11:15", "rest", "Break", null, false, 4),
            Block(DayOfWeek.Friday, "11:15", "12:30", "ml", "ML Study", "Week review + next week plan", true, 5),
            Block(DayOfWeek.Friday, "12:30", "13:30", "rest", "Lunch + Walk", null, false, 6),
            Block(DayOfWeek.Friday, "13:30", "14:30", "reading", "Reading Hour", null, true, 7),
            Block(DayOfWeek.Friday, "14:30", "22:30", "work", "Full-time Work", null, true, 8),
            Block(DayOfWeek.Friday, "22:30", "23:15", "rest", "Dinner + Show + Day Review", null, false, 9),

            // Saturday
            Block(DayOfWeek.Saturday, "07:00", "08:00", "gym", "Gym", "Sleep in 30 min", false, 0),
            Block(DayOfWeek.Saturday, "08:00", "09:00", "rest", "Breakfast + IG", "Longer window okay", false, 1),
            Block(DayOfWeek.Saturday, "09:00", "12:00", "deep", "Pet Projects", "cgb, LegacyLift, vxlabs", true, 2),
            Block(DayOfWeek.Saturday, "12:00", "13:00", "rest", "Lunch", null, false, 3),
            Block(DayOfWeek.Saturday, "13:00", "14:00", "reading", "Reading", null, false, 4),
            Block(DayOfWeek.Saturday, "14:00", "23:00", "off", "Free Time", "Beach, friends, shows, rest", false, 5),

            // Sunday
            Block(DayOfWeek.Sunday, "08:00", "23:00", "off", "Full Rest Day", "No coding. No content. Brain recovery.", false, 0),
        };

        db.TimeBlocks.AddRange(blocks);
    }

    private static void SeedHabits(ProtocolDbContext db)
    {
        if (db.HabitDefinitions.Any()) return;

        // ApplicableDays bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
        // 0 = every day
        // Weekdays only (Mon–Fri) = 2+4+8+16+32 = 62
        // Sleep habit applies every day = 0
        db.HabitDefinitions.AddRange(
            new HabitDefinition { Key = "active_recall",  Label = "Active Recall after study/reading",       Icon = "🧠", ApplicableDays = 62 }, // weekdays
            new HabitDefinition { Key = "ig_caged",       Label = "No IG outside breakfast + dinner",        Icon = "📵", ApplicableDays = 0  }, // every day
            new HabitDefinition { Key = "one_screen",     Label = "1 screen, 1 task (no shows while working)",Icon = "🖥️", ApplicableDays = 62 }, // weekdays
            new HabitDefinition { Key = "lunch_walk",     Label = "Lunch walk (no screens)",                 Icon = "🚶", ApplicableDays = 62 }, // weekdays
            new HabitDefinition { Key = "sleep_1115",     Label = "Lights out by 11:15 PM",                  Icon = "🌙", ApplicableDays = 0  }, // every day
            new HabitDefinition { Key = "day_review",     Label = "2-min mental day review",                 Icon = "📝", ApplicableDays = 62 }  // weekdays
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
