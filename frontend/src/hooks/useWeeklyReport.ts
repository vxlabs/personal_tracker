import { useState, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { WeeklyReportDto } from '@/types'

interface UseWeeklyReportReturn {
  report: WeeklyReportDto | null
  loading: boolean
  error: string | null
  fetchReport: (week?: string) => Promise<void>
}

export function useWeeklyReport(): UseWeeklyReportReturn {
  const [report, setReport] = useState<WeeklyReportDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async (week?: string) => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<WeeklyReportDto>(API_ENDPOINTS.REVIEW_WEEKLY, {
        params: week ? { week } : {},
      })
      setReport(res.data)
    } catch {
      setError('Failed to load weekly report')
      setReport(null)
    } finally {
      setLoading(false)
    }
  }, [])

  return { report, loading, error, fetchReport }
}
