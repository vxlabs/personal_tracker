// no react hooks needed
import { ChevronLeft, ChevronRight } from 'lucide-react'
import type { CalendarEntry } from '@/types'

interface Props {
  year: number
  month: number
  entries: CalendarEntry[]
  loading: boolean
  selectedDate: string
  onSelectDate: (date: string) => void
  onChangeMonth: (year: number, month: number) => void
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function CalendarHeatmap({
  year,
  month,
  entries,
  loading,
  selectedDate,
  onSelectDate,
  onChangeMonth,
}: Props) {
  const reviewSet = new Set(entries.filter((e) => e.hasReview).map((e) => e.date))

  const firstDay = new Date(year, month - 1, 1)
  const lastDay = new Date(year, month, 0)
  const startPad = firstDay.getDay()
  const daysInMonth = lastDay.getDate()

  const today = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const monthLabel = firstDay.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  const prevMonth = () => {
    const d = new Date(year, month - 2, 1)
    onChangeMonth(d.getFullYear(), d.getMonth() + 1)
  }
  const nextMonth = () => {
    const d = new Date(year, month, 1)
    onChangeMonth(d.getFullYear(), d.getMonth() + 1)
  }

  const cells: (string | null)[] = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(`${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`)
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-5 space-y-4">
      {/* Month nav */}
      <div className="flex items-center justify-between">
        <button onClick={prevMonth} className="p-1 rounded hover:bg-surface-2 text-text-dim transition-colors">
          <ChevronLeft size={16} />
        </button>
        <span className="font-sans text-sm font-medium text-text-primary">{monthLabel}</span>
        <button onClick={nextMonth} className="p-1 rounded hover:bg-surface-2 text-text-dim transition-colors">
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 text-center">
        {DAY_NAMES.map((d) => (
          <span key={d} className="font-mono text-[10px] text-text-dim uppercase">
            {d}
          </span>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square rounded animate-pulse bg-surface-2" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-1">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={`pad-${i}`} />

            const dayNum = parseInt(dateStr.split('-')[2], 10)
            const hasReview = reviewSet.has(dateStr)
            const isSelected = dateStr === selectedDate
            const isToday = dateStr === todayStr
            const isFuture = dateStr > todayStr

            return (
              <button
                key={dateStr}
                onClick={() => !isFuture && onSelectDate(dateStr)}
                disabled={isFuture}
                className={`
                  aspect-square rounded-md flex items-center justify-center font-mono text-xs transition-all
                  ${isFuture ? 'opacity-25 cursor-not-allowed' : 'cursor-pointer hover:ring-1 hover:ring-accent-cyan/40'}
                  ${isSelected ? 'ring-2 ring-accent-cyan' : ''}
                  ${hasReview ? 'bg-accent-green/20 text-accent-green' : 'text-text-dim'}
                  ${isToday && !isSelected ? 'ring-1 ring-text-dim/30' : ''}
                `}
              >
                {dayNum}
              </button>
            )
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 justify-center pt-1">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-accent-green/20" />
          <span className="font-mono text-[10px] text-text-dim">Reviewed</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-surface-2" />
          <span className="font-mono text-[10px] text-text-dim">Missed</span>
        </div>
      </div>
    </div>
  )
}
