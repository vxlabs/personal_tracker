import { WEEK_GRID } from '@/components/schedule/scheduleTime'

const GRID_HOURS = [8, 10, 12, 14, 16, 18, 20, 22]

interface Props {
  className?: string
}

export function GridLines({ className }: Props) {
  const range = WEEK_GRID.END_MINUTES - WEEK_GRID.START_MINUTES

  return (
    <div
      className={`pointer-events-none absolute inset-0 z-0 ${className ?? ''}`}
      aria-hidden
    >
      {GRID_HOURS.map((h) => {
        const minutes = h * 60
        const pct = ((minutes - WEEK_GRID.START_MINUTES) / range) * 100
        return (
          <div
            key={h}
            className="absolute left-0 right-0 border-t border-border/20"
            style={{ top: `${pct}%` }}
          />
        )
      })}
    </div>
  )
}
