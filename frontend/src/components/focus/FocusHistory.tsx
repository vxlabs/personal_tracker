import type { FocusSessionDto } from '@/types'
import { blockColor } from '@/utils/blockColors'

interface FocusHistoryProps {
  sessions: FocusSessionDto[]
  loading: boolean
}

function formatDuration(minutes: number | null): string {
  if (!minutes || minutes <= 0) return '< 1m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function formatTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
}

export function FocusHistory({ sessions, loading }: FocusHistoryProps) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((n) => (
          <div key={n} className="rounded-lg border border-border bg-surface-1 h-14 animate-pulse" />
        ))}
      </div>
    )
  }

  if (sessions.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-surface-1 px-5 py-8 text-center">
        <p className="font-mono text-sm text-text-dim">No focus sessions yet. Start your first one above.</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {sessions.map((s) => {
        const color = blockColor(s.blockType)
        return (
          <div
            key={s.id}
            className="rounded-lg border border-border bg-surface-1 px-4 py-3 flex items-center gap-4"
            style={{ borderLeftWidth: 3, borderLeftColor: color }}
          >
            {/* Type badge */}
            <span
              className="font-mono text-xs font-semibold shrink-0 px-2 py-0.5 rounded"
              style={{ color, background: `${color}18` }}
            >
              {s.blockType.toUpperCase()}
            </span>

            {/* Label + date */}
            <div className="flex-1 min-w-0">
              <p className="font-sans text-sm font-medium text-text-primary truncate">{s.blockLabel}</p>
              <p className="font-mono text-xs text-text-dim">
                {formatDate(s.startedAt)} · {formatTime(s.startedAt)}
                {s.endedAt && ` → ${formatTime(s.endedAt)}`}
              </p>
            </div>

            {/* Duration */}
            <span className="font-mono text-sm tabular-nums text-text-secondary shrink-0">
              {formatDuration(s.durationMinutes)}
            </span>
          </div>
        )
      })}
    </div>
  )
}
