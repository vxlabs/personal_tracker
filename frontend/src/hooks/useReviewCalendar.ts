import { useState, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { CalendarEntry } from '@/types'

interface UseReviewCalendarReturn {
  entries: CalendarEntry[]
  loading: boolean
  fetchCalendar: (year: number, month: number) => Promise<void>
}

export function useReviewCalendar(): UseReviewCalendarReturn {
  const [entries, setEntries] = useState<CalendarEntry[]>([])
  const [loading, setLoading] = useState(false)

  const fetchCalendar = useCallback(async (year: number, month: number) => {
    setLoading(true)
    try {
      const res = await api.get<CalendarEntry[]>(API_ENDPOINTS.REVIEW_CALENDAR, {
        params: { year, month },
      })
      setEntries(res.data)
    } catch {
      setEntries([])
    } finally {
      setLoading(false)
    }
  }, [])

  return { entries, loading, fetchCalendar }
}
