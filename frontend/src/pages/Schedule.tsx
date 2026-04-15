import { CalendarDays } from 'lucide-react'
import { WeekView } from '@/components/schedule/WeekView'
import { istWeekRangeLabel } from '@/components/schedule/weekConstants'

const weekRange = istWeekRangeLabel()

export function Schedule() {
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header — compact on mobile, full on desktop */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 shrink-0 text-accent-cyan" />
        <div className="flex flex-1 items-baseline gap-3 min-w-0">
          <h1 className="font-sans text-xl font-semibold text-text-primary">Schedule</h1>
          <span className="hidden md:block font-mono text-xs text-text-dim tabular-nums">
            {weekRange}
          </span>
          <span className="md:hidden font-sans text-xs text-text-dim">
            Week view · IST
          </span>
        </div>
      </div>

      <WeekView />
    </div>
  )
}
