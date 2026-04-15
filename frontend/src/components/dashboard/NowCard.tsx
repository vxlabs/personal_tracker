import { ChevronRight } from 'lucide-react'
import type { NowResponse } from '@/types'
import { BlockTypeIcon } from '@/utils/blockTypeIcon'
import { blockColor, formatRemaining } from '@/utils/blockColors'

interface Props {
  data: NowResponse | null
  loading: boolean
  error: boolean
  liveMinutes: number | null
}

export function NowCard({ data, loading, error, liveMinutes }: Props) {
  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 animate-pulse min-h-[140px]" />
    )
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 px-6 py-5">
        <p className="font-sans text-sm text-text-dim">Backend offline — start the API server.</p>
      </div>
    )
  }

  const { currentBlock, nextBlock, percentComplete } = data
  // Use the live local countdown; fall back to server value on the first render
  const minutesRemaining = liveMinutes ?? data.minutesRemaining

  if (!currentBlock) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 px-6 py-5" style={{ borderLeftWidth: 3, borderLeftColor: 'var(--color-text-dim)' }}>
        <p className="font-sans text-xs font-semibold uppercase tracking-wider text-text-dim mb-1">No active block</p>
        {nextBlock && (
          <p className="font-sans text-sm text-text-secondary">
            Next: <span style={{ color: blockColor(nextBlock.type) }}>{nextBlock.label}</span>{' '}
            at <span className="font-mono">{nextBlock.startTime}</span>
          </p>
        )}
      </div>
    )
  }

  const color = blockColor(currentBlock.type)
  const isFocus = currentBlock.isFocusBlock

  return (
    <div
      className="rounded-xl border border-border/60 bg-surface-1 px-6 py-5"
      style={{
        borderLeftWidth: 3,
        borderLeftColor: color,
        boxShadow: isFocus ? `0 0 24px ${color}18` : undefined,
      }}
    >
      {/* Header row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="shrink-0 inline-flex" style={{ color }}>
            <BlockTypeIcon type={currentBlock.type} />
          </span>
          <span
            className="font-mono text-xs font-semibold tracking-widest px-2 py-0.5 rounded"
            style={{ color, background: `${color}15` }}
          >
            {currentBlock.type.toUpperCase()}
            {isFocus && ' · FOCUS'}
          </span>
        </div>
        <span className="font-mono text-xs tabular-nums text-text-dim">
          {currentBlock.startTime}–{currentBlock.endTime}
        </span>
      </div>

      {/* Block label */}
      <h2 className="font-sans text-xl font-semibold text-text-primary mb-1">
        {currentBlock.label}
      </h2>

      {/* Note */}
      {currentBlock.note && (
        <p className="font-sans text-sm text-text-dim mb-4">{currentBlock.note}</p>
      )}

      {/* Progress bar */}
      <div className="mt-4 mb-2">
        <div className="h-1 rounded-full overflow-hidden bg-border">
          <div
            className="h-full rounded-full transition-all duration-1000"
            style={{ width: `${Math.min(percentComplete, 100)}%`, background: color }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <span className="font-sans text-xs text-text-dim">{formatRemaining(minutesRemaining)}</span>
        <span className="font-mono text-xs tabular-nums text-text-dim">{percentComplete.toFixed(0)}%</span>
      </div>

      {/* Next block */}
      {nextBlock && (
        <div className="flex items-center gap-1.5 mt-4 pt-3 border-t border-border/60">
          <ChevronRight size={12} className="text-text-dim shrink-0" />
          <span className="font-sans text-xs text-text-dim">
            Next:{' '}
            <span style={{ color: blockColor(nextBlock.type) }}>{nextBlock.label}</span>
            {' '}at <span className="font-mono">{nextBlock.startTime}</span>
          </span>
        </div>
      )}
    </div>
  )
}
