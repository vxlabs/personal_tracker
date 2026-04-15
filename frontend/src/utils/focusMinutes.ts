import type { BlockDto } from '@/types'

/** Parses `HH:mm` from API (TimeSpan formatted). */
export function parseBlockTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map((x) => Number.parseInt(x, 10))
  if (Number.isNaN(h) || Number.isNaN(m)) return 0
  return h * 60 + m
}

/**
 * Focus “done” minutes for today: finished focus blocks plus elapsed time in the current focus block.
 */
export function focusMinutesCompletedToday(blocks: BlockDto[] | undefined, nowMinutes: number): number {
  if (!blocks?.length) return 0
  let total = 0
  for (const b of blocks) {
    if (!b.isFocusBlock) continue
    const start = parseBlockTimeToMinutes(b.startTime)
    const end = parseBlockTimeToMinutes(b.endTime)
    if (end <= start) continue
    if (end <= nowMinutes) {
      total += end - start
    } else if (start < nowMinutes) {
      total += nowMinutes - start
    }
  }
  return total
}

export function formatFocusDuration(minutes: number): string {
  if (minutes <= 0) return '0m'
  if (minutes < 60) return `${minutes}m`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
