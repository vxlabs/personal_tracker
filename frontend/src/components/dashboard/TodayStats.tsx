interface Props {
  focusLabel: string
  habitsDone: number
  habitsTotal: number
  longestStreak: number
  loading: boolean
}

export function TodayStats({ focusLabel, habitsDone, habitsTotal, longestStreak, loading }: Props) {
  return (
    <div className="grid gap-3 grid-cols-3">
      <StatCard title="Focus today" value={loading ? '—' : focusLabel} />
      <StatCard
        title="Habits"
        value={loading ? '—' : `${habitsDone}/${habitsTotal}`}
      />
      <StatCard
        title="Top streak"
        value={loading ? '—' : longestStreak > 0 ? `${longestStreak}d` : '—'}
      />
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 px-4 py-4">
      <p className="font-sans text-xs font-medium text-text-dim mb-2">{title}</p>
      <p className="font-mono text-xl font-semibold text-text-primary tabular-nums">{value}</p>
    </div>
  )
}
