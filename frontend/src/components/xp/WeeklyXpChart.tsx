import type { XpWeekBar } from '@/types'

type Props = {
  weeks: XpWeekBar[]
  loading?: boolean
}

export function WeeklyXpChart({ weeks, loading }: Props) {
  if (loading) {
    return (
      <div className="h-36 rounded-xl border border-border bg-surface-1 animate-pulse" aria-hidden />
    )
  }

  if (weeks.length === 0) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-4 text-sm text-text-dim">
        XP weekly chart will appear when the server is available.
      </div>
    )
  }

  const max = Math.max(1, ...weeks.map((w) => w.totalXp))
  const label = (w: string) => {
    const m = w.match(/W(\d+)$/)
    return m ? `W${m[1]}` : w
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <h3 className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim mb-4">
        Your XP (weekly)
      </h3>
      <p className="text-xs text-text-dim mb-3">
        Compare last 8 ISO weeks (IST). Same you, week over week.
      </p>
      <div className="flex items-end justify-between gap-1" role="img" aria-label="Weekly XP bars">
        {weeks.map((w) => {
          const pct = Math.max(6, Math.round((w.totalXp / max) * 100))
          return (
            <div key={w.week} className="flex flex-1 flex-col items-center gap-1 min-w-0 h-28">
              <div className="flex h-24 w-full max-w-[40px] mx-auto flex-col justify-end">
                <div
                  className="w-full rounded-t bg-accent-purple/80 min-h-[3px]"
                  style={{ height: `${pct}%` }}
                  title={`${w.week}: ${w.totalXp} XP`}
                />
              </div>
              <span className="font-mono text-[9px] text-text-dim truncate w-full text-center">
                {label(w.week)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
