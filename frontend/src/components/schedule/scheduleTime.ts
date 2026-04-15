/** Visible schedule range (matches typical seeded blocks ~06:00–24:00). */
export const WEEK_GRID = {
  START_MINUTES: 6 * 60,
  END_MINUTES: 24 * 60,
} as const

function gridRangeMinutes(): number {
  return WEEK_GRID.END_MINUTES - WEEK_GRID.START_MINUTES
}

/** Parse API time "HH:mm" to minutes since midnight. */
export function parseTimeToMinutes(time: string): number {
  const [h, m] = time.split(':').map((x) => Number.parseInt(x, 10))
  return h * 60 + m
}

/** Minimum block height as % of column so short blocks stay clickable. */
const MIN_BLOCK_HEIGHT_PCT = 1.35

export function blockLayoutPercent(start: string, end: string): { top: number; height: number } {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  const range = gridRangeMinutes()
  const top = ((s - WEEK_GRID.START_MINUTES) / range) * 100
  const height = ((e - s) / range) * 100
  return {
    top: Math.max(0, top),
    height: Math.max(MIN_BLOCK_HEIGHT_PCT, height),
  }
}

/** Percent from top for current-time line, or null if outside the visible grid. */
export function currentTimeLinePercent(nowMinutesSinceMidnight: number): number | null {
  if (
    nowMinutesSinceMidnight < WEEK_GRID.START_MINUTES ||
    nowMinutesSinceMidnight > WEEK_GRID.END_MINUTES
  ) {
    return null
  }
  const range = gridRangeMinutes()
  return ((nowMinutesSinceMidnight - WEEK_GRID.START_MINUTES) / range) * 100
}

export function isBlockActiveNow(
  start: string,
  end: string,
  nowMinutesSinceMidnight: number,
): boolean {
  const s = parseTimeToMinutes(start)
  const e = parseTimeToMinutes(end)
  return nowMinutesSinceMidnight >= s && nowMinutesSinceMidnight < e
}
