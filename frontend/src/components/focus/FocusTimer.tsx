interface FocusTimerProps {
  seconds: number
  label: string
  variant?: 'up' | 'down'
  size?: 'sm' | 'lg'
}

function formatSeconds(s: number): string {
  const abs = Math.max(0, s)
  const h = Math.floor(abs / 3600)
  const m = Math.floor((abs % 3600) / 60)
  const sec = abs % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(sec).padStart(2, '0')
  if (h > 0) return `${h}:${mm}:${ss}`
  return `${mm}:${ss}`
}

export function FocusTimer({ seconds, label, variant = 'up', size = 'sm' }: FocusTimerProps) {
  const timeStr = formatSeconds(seconds)
  const isLarge = size === 'lg'

  return (
    <div className="flex flex-col items-center gap-1">
      <span
        className={`font-mono tabular-nums font-semibold leading-none ${
          isLarge ? 'text-5xl' : 'text-2xl'
        } text-text-primary`}
      >
        {timeStr}
      </span>
      <span className="font-sans text-xs text-text-dim uppercase tracking-wider">
        {variant === 'up' ? '▲' : '▼'} {label}
      </span>
    </div>
  )
}
