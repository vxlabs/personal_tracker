/** Current weekday name in Asia/Kolkata, lowercase (e.g. `monday`). Matches API schedule keys. */
export function istWeekdayKey(): string {
  return new Date()
    .toLocaleDateString('en-US', { timeZone: 'Asia/Kolkata', weekday: 'long' })
    .toLowerCase()
}

/** Minutes since local midnight in Asia/Kolkata (0–1439). */
export function istMinutesSinceMidnight(): number {
  const formatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const parts = formatter.formatToParts(new Date())
  const hour = Number.parseInt(parts.find((p) => p.type === 'hour')?.value ?? '0', 10)
  const minute = Number.parseInt(parts.find((p) => p.type === 'minute')?.value ?? '0', 10)
  return hour * 60 + minute
}
