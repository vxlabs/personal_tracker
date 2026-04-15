/** API `GetFullWeekAsync` keys — lowercase `DayOfWeek.ToString()` */
export const ORDERED_DAY_KEYS = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const

export type DayKey = (typeof ORDERED_DAY_KEYS)[number]

const SHORT: Record<string, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export function dayShortLabel(key: string): string {
  return SHORT[key.toLowerCase()] ?? key
}

/**
 * Returns a map from day key → date number (1–31) for the current IST week (Mon–Sun).
 * E.g. if today is Wed Apr 16 in IST, returns { monday: 14, tuesday: 15, ... sunday: 20 }.
 */
export function istWeekDateNumbers(): Record<string, number> {
  // Get today in IST using Intl
  const nowIst = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  )
  // JS getDay: 0=Sun,1=Mon,...,6=Sat — convert to Mon=0 offset
  const jsDay = nowIst.getDay() // 0=Sun
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay // days to subtract to reach Monday

  const result: Record<string, number> = {}
  ORDERED_DAY_KEYS.forEach((key, idx) => {
    const d = new Date(nowIst)
    d.setDate(nowIst.getDate() + mondayOffset + idx)
    result[key] = d.getDate()
  })
  return result
}

/**
 * Returns the week range string for the schedule header, e.g. "Apr 14 – 20, 2026".
 */
export function istWeekRangeLabel(): string {
  const nowIst = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }),
  )
  const jsDay = nowIst.getDay()
  const mondayOffset = jsDay === 0 ? -6 : 1 - jsDay

  const mon = new Date(nowIst)
  mon.setDate(nowIst.getDate() + mondayOffset)
  const sun = new Date(mon)
  sun.setDate(mon.getDate() + 6)

  const fmtMonth = (d: Date) =>
    d.toLocaleDateString('en-US', { month: 'short', timeZone: 'Asia/Kolkata' })
  const fmtDay = (d: Date) => d.getDate()
  const year = sun.getFullYear()

  if (fmtMonth(mon) === fmtMonth(sun)) {
    return `${fmtMonth(mon)} ${fmtDay(mon)} – ${fmtDay(sun)}, ${year}`
  }
  return `${fmtMonth(mon)} ${fmtDay(mon)} – ${fmtMonth(sun)} ${fmtDay(sun)}, ${year}`
}
