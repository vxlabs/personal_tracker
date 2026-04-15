import { useState, useEffect } from 'react'
import { LayoutDashboard } from 'lucide-react'
import { WeeklyXpChart } from '@/components/xp/WeeklyXpChart'
import { useXp } from '@/context/XpContext'
import { NowCard } from '@/components/dashboard/NowCard'
import { HabitsSection } from '@/components/dashboard/HabitsSection'
import { TodayStats } from '@/components/dashboard/TodayStats'
import { TIMING_CONFIG } from '@/constants/timing'
import { useCurrentBlock } from '@/hooks/useCurrentBlock'
import { useHabits } from '@/hooks/useHabits'
import { useScheduleWeek } from '@/hooks/useScheduleWeek'
import { focusMinutesCompletedToday, formatFocusDuration } from '@/utils/focusMinutes'
import { istMinutesSinceMidnight, istWeekdayKey } from '@/utils/istTime'

export function Dashboard() {
  const { summary, loading: xpLoading } = useXp()
  const { data: nowData, loading: nowLoading, error: nowError, liveMinutes } = useCurrentBlock()
  const { habits, loading: habitsLoading, toggle } = useHabits()
  const { week, loading: weekLoading } = useScheduleWeek()
  /** Bumps periodically so “focus today” minutes stay fresh without polling `/schedule` often. */
  const [statsTick, setStatsTick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setStatsTick((t) => t + 1), TIMING_CONFIG.DASHBOARD_STATS_TICK_MS)
    return () => clearInterval(id)
  }, [])

  const statsLoading = weekLoading || habitsLoading
  const dayKey = istWeekdayKey()
  const todayBlocks = week?.[dayKey]
  const focusMin = focusMinutesCompletedToday(todayBlocks, istMinutesSinceMidnight())
  const applicable = habits.filter((h) => h.isApplicableToday)
  const habitsDone = applicable.filter((h) => h.isCompletedToday).length
  const habitsTotal = applicable.length
  const longestStreak = applicable.length > 0 ? Math.max(...applicable.map((h) => h.currentStreak)) : 0
  const focusLabel = formatFocusDuration(focusMin)

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-3">
        <LayoutDashboard className="h-5 w-5 text-accent-purple" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Dashboard</h1>
      </div>

      <section className="space-y-3">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim">Now</h2>
        <NowCard data={nowData} loading={nowLoading} error={nowError} liveMinutes={liveMinutes} />
      </section>

      <section className="space-y-3" data-stats-tick={statsTick}>
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim">Today&apos;s stats</h2>
        <TodayStats
          focusLabel={focusLabel}
          habitsDone={habitsDone}
          habitsTotal={habitsTotal}
          longestStreak={longestStreak}
          loading={statsLoading}
        />
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim">Progress</h2>
        <WeeklyXpChart weeks={summary?.weeklyBars ?? []} loading={xpLoading} />
      </section>

      <section className="space-y-3">
        <h2 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim">Habits</h2>
        <HabitsSection habits={habits} loading={habitsLoading} onToggle={toggle} />
      </section>
    </div>
  )
}
