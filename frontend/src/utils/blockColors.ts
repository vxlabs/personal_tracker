export const BLOCK_COLORS: Record<string, string> = {
  football: '#22c55e',
  gym: '#f97316',
  ml: '#06b6d4',
  content: '#ec4899',
  reading: '#a78bfa',
  work: '#facc15',
  rest: '#64748b',
  off: '#34d399',
  routine: '#94a3b8',
  deep: '#818cf8',
}

export function blockColor(type: string): string {
  return BLOCK_COLORS[type.toLowerCase()] ?? '#7a7a90'
}

export function formatRemaining(minutes: number): string {
  if (minutes <= 0) return 'ending now'
  if (minutes < 60) return `${minutes}m remaining`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m remaining` : `${h}h remaining`
}

export function streakDisplay(streak: number): string {
  if (streak === 0) return ''
  if (streak >= 30) return `💎 ${streak}`
  if (streak >= 14) return `🔥🔥🔥 ${streak}`
  if (streak >= 7) return `🔥🔥 ${streak}`
  return `🔥 ${streak}`
}
