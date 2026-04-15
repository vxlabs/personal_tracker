import { ORDERED_DAY_KEYS, dayShortLabel, istWeekDateNumbers } from '@/components/schedule/weekConstants'

interface Props {
  activeKey: string
  todayKey: string
  onSelect: (key: string) => void
}

const weekDates = istWeekDateNumbers()

export function DayTabs({ activeKey, todayKey, onSelect }: Props) {
  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1 scrollbar-none">
      {ORDERED_DAY_KEYS.map((key) => {
        const isToday = key === todayKey
        const isActive = key === activeKey
        const dateNum = weekDates[key]

        return (
          <button
            key={key}
            type="button"
            onClick={() => onSelect(key)}
            className={[
              'flex shrink-0 flex-col items-center rounded-lg px-3 py-1.5 transition-all duration-150',
              isActive && isToday
                ? 'bg-accent-cyan text-bg'
                : isActive
                  ? 'bg-surface-2 text-text-primary'
                  : isToday
                    ? 'text-accent-cyan'
                    : 'text-text-dim hover:text-text-secondary',
            ]
              .filter(Boolean)
              .join(' ')}
          >
            <span className="font-sans text-[10px] font-semibold leading-tight tracking-wide uppercase">
              {dayShortLabel(key)}
            </span>
            {dateNum !== undefined && (
              <span className={[
                'font-mono text-xs font-bold tabular-nums leading-tight',
                isActive && isToday ? 'text-bg' : isToday ? 'text-accent-cyan' : '',
              ].filter(Boolean).join(' ')}>
                {dateNum}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
