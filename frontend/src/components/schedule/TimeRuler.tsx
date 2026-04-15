import { WEEK_GRID } from '@/components/schedule/scheduleTime'

const RULER_HOURS = [6, 8, 10, 12, 14, 16, 18, 20, 22, 24]

export function TimeRuler({ className }: { className?: string }) {
  const range = WEEK_GRID.END_MINUTES - WEEK_GRID.START_MINUTES
  return (
    <div
      className={`relative flex shrink-0 select-none flex-col ${className ?? ''}`}
      style={{ width: 44 }}
      aria-hidden
    >
      {RULER_HOURS.map((h) => {
        const minutes = h === 24 ? 24 * 60 : h * 60
        const pct = ((minutes - WEEK_GRID.START_MINUTES) / range) * 100
        const label = h === 24 ? '00:00' : `${String(h).padStart(2, '0')}:00`
        return (
          <div
            key={h}
            className="absolute right-0 flex items-center gap-1"
            style={{ top: `${pct}%`, transform: 'translateY(-50%)' }}
          >
            {/* tick line */}
            <div className="h-px w-2 bg-border/40" />
            <span className="font-mono text-2xs tabular-nums text-text-dim/80 leading-none">
              {label}
            </span>
          </div>
        )
      })}
    </div>
  )
}
