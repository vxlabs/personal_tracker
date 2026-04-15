import type { BlockDto } from '@/types'
import { blockColor } from '@/utils/blockColors'
import { blockLayoutPercent, isBlockActiveNow } from '@/components/schedule/scheduleTime'

interface Props {
  block: BlockDto
  isToday: boolean
  nowMinutes: number
  isSelected: boolean
  onSelect: (block: BlockDto) => void
}

/** Convert a hex color string to an rgba string at the given opacity. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function TimeBlock({ block, isToday, nowMinutes, isSelected, onSelect }: Props) {
  const { top, height } = blockLayoutPercent(block.startTime, block.endTime)
  const color = blockColor(block.type)
  const active = isToday && isBlockActiveNow(block.startTime, block.endTime, nowMinutes)

  // < ~22 min (e.g. 15-min breaks): tiny single-line
  const isCompact = height < 2
  // >= ~40 min: enough vertical room for label + time on two lines
  const showTime = height >= 4

  return (
    <button
      type="button"
      onClick={() => onSelect(block)}
      title={`${block.startTime}–${block.endTime} · ${block.label}`}
      className={[
        'absolute right-0.5 left-0.5 overflow-hidden rounded-md border border-border/50 text-left transition-all duration-150',
        isCompact
          ? 'flex items-center px-1.5 py-0'
          : 'flex flex-col justify-center px-2 py-0.5',
        'hover:z-10 hover:border-accent-cyan/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan',
        active ? 'z-[5] border-accent-cyan/60 shadow-[0_0_8px_rgba(6,182,212,0.15)]' : '',
        isSelected ? 'z-[8] ring-2 ring-accent-purple/80 border-accent-purple/50' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      style={{
        top: `${top}%`,
        height: `${height}%`,
        minHeight: isCompact ? 16 : undefined,
        borderLeftWidth: 3,
        borderLeftColor: color,
        backgroundColor: hexToRgba(color, active ? 0.10 : 0.06),
      }}
    >
      <span
        className={[
          'font-sans font-semibold text-text-primary truncate w-full',
          isCompact ? 'text-[10px] leading-none' : 'text-xs leading-snug',
        ].filter(Boolean).join(' ')}
      >
        {block.label}
      </span>
      {showTime && (
        <span
          className="font-mono text-[10px] tabular-nums leading-none truncate mt-0.5"
          style={{ color }}
        >
          {block.startTime}–{block.endTime}
        </span>
      )}
    </button>
  )
}
