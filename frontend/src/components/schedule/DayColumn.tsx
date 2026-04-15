import type { BlockDto } from '@/types'
import { TimeBlock } from '@/components/schedule/TimeBlock'
import { CurrentTimeIndicator } from '@/components/schedule/CurrentTimeIndicator'
import { GridLines } from '@/components/schedule/GridLines'
import { currentTimeLinePercent } from '@/components/schedule/scheduleTime'
import { dayShortLabel, istWeekDateNumbers } from '@/components/schedule/weekConstants'

interface Props {
  dayKey: string
  blocks: BlockDto[]
  isToday: boolean
  nowMinutes: number
  selectedId: number | null
  onSelectBlock: (block: BlockDto) => void
  /** When true, the column expands to fill available width (mobile single-day view). */
  fullWidth?: boolean
}

function dayFocusSubtitle(blocks: BlockDto[]): string | null {
  const focus = blocks.find((b) => b.isFocusBlock)
  return focus?.label ?? null
}

const weekDates = istWeekDateNumbers()

export function DayColumn({
  dayKey,
  blocks,
  isToday,
  nowMinutes,
  selectedId,
  onSelectBlock,
  fullWidth = false,
}: Props) {
  const linePct = isToday ? currentTimeLinePercent(nowMinutes) : null
  const subtitle = dayFocusSubtitle(blocks)
  const dateNum = weekDates[dayKey]

  return (
    <div
      className={[
        'flex shrink-0 flex-col border-r border-border/40 last:border-r-0',
        fullWidth ? 'flex-1 min-w-0' : 'min-w-[120px]',
        isToday ? 'bg-accent-cyan/[0.06]' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* Day header */}
      <div
        className={[
          'flex h-14 shrink-0 flex-col items-center justify-center border-b px-2 text-center',
          isToday ? 'border-b-accent-cyan/40 border-b-2 bg-accent-cyan/[0.08]' : 'border-b-border/50',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {isToday ? (
          /* Today pill */
          <div className="flex items-baseline gap-1.5">
            <span className="rounded-full bg-accent-cyan px-2 py-0.5 font-sans text-xs font-bold tracking-wide text-bg leading-tight">
              {dayShortLabel(dayKey)}
            </span>
            {dateNum !== undefined && (
              <span className="font-mono text-xs font-semibold tabular-nums text-accent-cyan">
                {dateNum}
              </span>
            )}
          </div>
        ) : (
          /* Non-today header */
          <div className="flex items-baseline gap-1">
            <span className="font-sans text-xs font-semibold tracking-wide text-text-secondary">
              {dayShortLabel(dayKey)}
            </span>
            {dateNum !== undefined && (
              <span className="font-mono text-xs tabular-nums text-text-dim">
                {dateNum}
              </span>
            )}
          </div>
        )}
        {subtitle && (
          <p className="mt-0.5 font-sans text-xs leading-tight text-text-dim truncate max-w-[110px]">
            {subtitle}
          </p>
        )}
      </div>

      {/* Blocks area */}
      <div className="relative min-h-[calc(min(72vh,840px)-3.5rem)] flex-1">
        <GridLines />
        {linePct !== null && <CurrentTimeIndicator topPercent={linePct} nowMinutes={nowMinutes} />}
        {blocks.map((b) => (
          <TimeBlock
            key={b.id}
            block={b}
            isToday={isToday}
            nowMinutes={nowMinutes}
            isSelected={selectedId === b.id}
            onSelect={onSelectBlock}
          />
        ))}
      </div>
    </div>
  )
}
