import { useState, useEffect } from 'react'
import { istMinutesSinceMidnight } from '@/utils/istTime'
import { TIMING_CONFIG } from '@/constants/timing'

/** Live IST “minutes since midnight” for positioning the current-time indicator. */
export function useIstMinutesSinceMidnight() {
  const [minutes, setMinutes] = useState(() => istMinutesSinceMidnight())

  useEffect(() => {
    const tick = () => setMinutes(istMinutesSinceMidnight())
    tick()
    const id = window.setInterval(tick, TIMING_CONFIG.WEEK_VIEW_CLOCK_TICK_MS)
    return () => window.clearInterval(id)
  }, [])

  return minutes
}
