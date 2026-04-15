import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { FocusSessionDto } from '@/types'

interface UseFocusHistoryReturn {
  sessions: FocusSessionDto[]
  loading: boolean
  refetch: () => Promise<void>
}

export function useFocusHistory(): UseFocusHistoryReturn {
  const [sessions, setSessions] = useState<FocusSessionDto[]>([])
  const [loading, setLoading] = useState(true)

  const refetch = useCallback(async () => {
    try {
      const res = await api.get<FocusSessionDto[]>(API_ENDPOINTS.FOCUS_HISTORY)
      setSessions(res.data)
    } catch {
      setSessions([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    refetch()
  }, [refetch])

  return { sessions, loading, refetch }
}
