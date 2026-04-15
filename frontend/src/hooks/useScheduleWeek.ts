import { useState, useEffect } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { BlockDto } from '@/types'

export function useScheduleWeek() {
  const [week, setWeek] = useState<Record<string, BlockDto[]> | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await api.get<Record<string, BlockDto[]>>(API_ENDPOINTS.SCHEDULE)
        if (!cancelled) setWeek(res.data)
      } catch {
        if (!cancelled) setWeek(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  return { week, loading }
}
