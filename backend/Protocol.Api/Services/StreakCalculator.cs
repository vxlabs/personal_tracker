using Protocol.Api.Models;

namespace Protocol.Api.Services;

public static class StreakCalculator
{
    // Bitmask: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64
    private static readonly int[] DayBits = [1, 2, 4, 8, 16, 32, 64];

    public static bool IsApplicable(HabitDefinition habit, DayOfWeek day)
    {
        if (habit.ApplicableDays == 0) return true;
        return (habit.ApplicableDays & DayBits[(int)day]) != 0;
    }

    /// <summary>
    /// Calculates current and longest streaks for a habit.
    ///
    /// Rules:
    /// - Non-applicable days are skipped (don't break or count the streak).
    /// - A past applicable day with no completion breaks the streak.
    /// - Today, if applicable and not yet completed, does not break the streak
    ///   (user still has time to check it off).
    /// </summary>
    public static (int CurrentStreak, int LongestStreak) Calculate(
        HabitDefinition habit,
        ILookup<DateOnly, HabitLog> logsByDate,
        DateOnly today)
    {
        int currentStreak = 0;
        int longestStreak = 0;
        int runningStreak = 0;
        bool currentStreakSet = false;

        // Scan backward from today through up to 3 years of history
        for (int i = 0; i <= 365 * 3; i++)
        {
            var date = today.AddDays(-i);

            if (!IsApplicable(habit, date.DayOfWeek))
                continue;

            bool completed = logsByDate[date].Any(l => l.IsCompleted);
            bool isPast = date < today;

            if (completed)
            {
                runningStreak++;
            }
            else if (isPast)
            {
                // Past applicable day not completed → streak break
                if (!currentStreakSet)
                {
                    currentStreak = runningStreak;
                    currentStreakSet = true;
                }
                longestStreak = Math.Max(longestStreak, runningStreak);
                runningStreak = 0;
            }
            // Today not yet completed: neither count nor break
        }

        // Flush the final running streak
        if (!currentStreakSet) currentStreak = runningStreak;
        longestStreak = Math.Max(longestStreak, runningStreak);

        return (currentStreak, longestStreak);
    }
}
