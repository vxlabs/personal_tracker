import { useEffect } from 'react'
import type { BlockDto } from '@/types'
import { blockColor } from '@/utils/blockColors'
import { BlockTypeIcon } from '@/utils/blockTypeIcon'
import { parseTimeToMinutes } from '@/components/schedule/scheduleTime'
import { X } from 'lucide-react'

interface Props {
  block: BlockDto
  onClose: () => void
}

function calcDuration(start: string, end: string): string {
  const mins = parseTimeToMinutes(end) - parseTimeToMinutes(start)
  if (mins <= 0) return ''
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h === 0) return `${m}m`
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

/** Convert hex to rgba. */
function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r},${g},${b},${alpha})`
}

export function BlockDetailSheet({ block, onClose }: Props) {
  const color = blockColor(block.type)
  const duration = calcDuration(block.startTime, block.endTime)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="block-detail-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-border bg-surface-1 shadow-2xl"
        style={{
          animation: 'slideUp 0.22s cubic-bezier(0.16,1,0.3,1)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top color bar with gradient */}
        <div
          className="h-1.5 w-full"
          style={{
            background: `linear-gradient(90deg, ${color} 0%, ${hexToRgba(color, 0.3)} 100%)`,
          }}
        />

        <div className="p-5">
          {/* Title row */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span style={{ color }} className="flex">
                <BlockTypeIcon type={block.type} className="h-5 w-5 shrink-0" />
              </span>
              <h2 id="block-detail-title" className="font-sans text-base font-bold text-text-primary leading-snug">
                {block.label}
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-md p-1 text-text-dim hover:bg-surface-2 hover:text-text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-cyan transition-colors"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Time + duration row */}
          <div className="mt-3 flex items-center gap-3">
            <p className="font-mono text-sm tabular-nums" style={{ color }}>
              {block.startTime} – {block.endTime}
            </p>
            {duration && (
              <span className="rounded-full bg-surface-2 px-2 py-0.5 font-mono text-xs text-text-dim tabular-nums">
                {duration}
              </span>
            )}
            <span className="font-sans text-xs text-text-dim">
              {block.dayOfWeek}
            </span>
          </div>

          {/* Type + focus badge */}
          <div className="mt-3 flex items-center gap-2">
            <span
              className="rounded px-2 py-0.5 font-mono text-xs uppercase tracking-wider"
              style={{ backgroundColor: hexToRgba(color, 0.15), color }}
            >
              {block.type}
            </span>
            {block.isFocusBlock && (
              <span className="rounded bg-accent-purple/20 px-1.5 py-0.5 font-mono text-xs text-accent-purple">
                focus
              </span>
            )}
          </div>

          {/* Note */}
          {block.note ? (
            <p className="mt-4 font-sans text-sm leading-relaxed text-text-secondary">{block.note}</p>
          ) : (
            <p className="mt-4 font-sans text-xs text-text-dim/60">No notes for this block.</p>
          )}
        </div>
      </div>
    </div>
  )
}
