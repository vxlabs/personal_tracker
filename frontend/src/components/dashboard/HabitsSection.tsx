import type { HabitStatus } from '@/types'
import { streakDisplay } from '@/utils/blockColors'

interface Props {
  habits: HabitStatus[]
  loading: boolean
  onToggle: (habitId: number, currentlyCompleted: boolean) => void
}

export function HabitsSection({ habits, loading, onToggle }: Props) {
  if (loading) {
    return (
      <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="rounded-lg bg-surface-1 animate-pulse h-[68px]" />
        ))}
      </div>
    )
  }

  const applicable = habits.filter(h => h.isApplicableToday)
  const notApplicable = habits.filter(h => !h.isApplicableToday)

  return (
    <div className="space-y-5">
      <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
        {applicable.map(habit => (
          <HabitCard key={habit.habitId} habit={habit} onToggle={onToggle} />
        ))}
      </div>

      {notApplicable.length > 0 && (
        <div>
          <p className="font-sans text-xs font-medium uppercase tracking-wider text-text-dim mb-2">
            Not applicable today
          </p>
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
            {notApplicable.map(habit => (
              <HabitCard key={habit.habitId} habit={habit} onToggle={onToggle} dimmed />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function HabitCard({
  habit,
  onToggle,
  dimmed = false,
}: {
  habit: HabitStatus
  onToggle: (id: number, completed: boolean) => void
  dimmed?: boolean
}) {
  const { habitId, icon, label, isCompletedToday, currentStreak, isApplicableToday } = habit
  const disabled = !isApplicableToday

  return (
    <button
      type="button"
      onClick={() => !disabled && onToggle(habitId, isCompletedToday)}
      disabled={disabled}
      className={[
        'text-left rounded-lg px-3.5 py-3 w-full transition-all border',
        isCompletedToday
          ? 'bg-[rgba(34,197,94,0.07)] border-[rgba(34,197,94,0.25)]'
          : 'bg-surface-1 border-border hover:border-border/80 hover:bg-surface-2/60',
        dimmed ? 'opacity-40' : '',
        disabled ? 'cursor-default' : 'cursor-pointer',
      ].filter(Boolean).join(' ')}
    >
      <div className="flex items-center gap-3">
        {/* Checkbox */}
        <div
          className="shrink-0 flex items-center justify-center rounded transition-all"
          style={{
            width: 18,
            height: 18,
            border: `2px solid ${isCompletedToday ? '#22c55e' : 'var(--color-border)'}`,
            background: isCompletedToday ? '#22c55e' : 'transparent',
          }}
        >
          {isCompletedToday && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path d="M1 4L3.5 6.5L9 1" stroke="#0a0a0f" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>

        {/* Icon + label */}
        <div className="flex-1 min-w-0 flex items-center gap-2">
          <span className="text-sm leading-none">{icon}</span>
          <span className={`font-sans text-sm font-medium leading-snug truncate ${isCompletedToday ? 'text-[#22c55e]' : 'text-text-primary'}`}>
            {label}
          </span>
        </div>

        {/* Streak */}
        {currentStreak > 0 && (
          <span className="shrink-0 font-mono text-xs tabular-nums text-text-dim">
            {streakDisplay(currentStreak)}
          </span>
        )}
      </div>
    </button>
  )
}
