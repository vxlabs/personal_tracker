interface Props {
  topPercent: number
  nowMinutes: number
}

function formatNowTime(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

export function CurrentTimeIndicator({ topPercent, nowMinutes }: Props) {
  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-20 flex items-center"
      style={{ top: `${topPercent}%`, transform: 'translateY(-50%)' }}
      aria-hidden
    >
      {/* Glowing line */}
      <div className="h-[2px] flex-1 bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.7)]" />
      {/* Pulsing dot */}
      <div className="relative ml-0.5 shrink-0">
        <div className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60" style={{ animationDuration: '1.5s' }} />
        <div className="relative h-2 w-2 rounded-full bg-red-500" />
      </div>
      {/* Time badge */}
      <div className="ml-1 shrink-0 rounded bg-red-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white tabular-nums shadow-md">
        {formatNowTime(nowMinutes)}
      </div>
    </div>
  )
}
