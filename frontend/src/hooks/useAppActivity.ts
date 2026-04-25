import { useCallback, useState } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { AppUsageSummary, AppTrainResult, AppLabelDto, AppMlStatus } from '@/types'

export function useAppActivity() {
  const [summary, setSummary] = useState<AppUsageSummary | null>(null)
  const [labels, setLabels] = useState<AppLabelDto[]>([])
  const [mlStatus, setMlStatus] = useState<AppMlStatus | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [training, setTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trainResult, setTrainResult] = useState<AppTrainResult | null>(null)

  const fetchSummary = useCallback(async (period: 'today' | 'week' | 'month' = 'today') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<AppUsageSummary>(API_ENDPOINTS.APP_ACTIVITY_SUMMARY, {
        params: { period },
      })
      setSummary(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app activity')
    } finally {
      setLoading(false)
    }
  }, [])

  const fetchLabels = useCallback(async () => {
    try {
      const res = await api.get<AppLabelDto[]>(API_ENDPOINTS.APP_ACTIVITY_LABELS)
      setLabels(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load app labels')
    }
  }, [])

  const fetchMlStatus = useCallback(async () => {
    try {
      const res = await api.get<AppMlStatus>(API_ENDPOINTS.APP_ACTIVITY_MODEL_STATUS)
      setMlStatus(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load ML status')
    }
  }, [])

  const saveLabel = useCallback(async (processName: string, label: string) => {
    setSaving(true)
    setError(null)
    try {
      const res = await api.put<AppLabelDto>(API_ENDPOINTS.APP_ACTIVITY_LABELS, {
        processName,
        label,
      })
      setLabels(prev => {
        const existing = prev.findIndex(l => l.processName === processName)
        if (existing >= 0) {
          const updated = [...prev]
          updated[existing] = res.data
          return updated
        }
        return [...prev, res.data]
      })
      return res.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save label')
      throw err
    } finally {
      setSaving(false)
    }
  }, [])

  const train = useCallback(async () => {
    setTraining(true)
    setError(null)
    try {
      const res = await api.post<AppTrainResult>(API_ENDPOINTS.APP_ACTIVITY_TRAIN)
      setTrainResult(res.data)
      return res.data
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to train model')
      throw err
    } finally {
      setTraining(false)
    }
  }, [])

  return {
    summary,
    labels,
    mlStatus,
    loading,
    saving,
    training,
    error,
    trainResult,
    fetchSummary,
    fetchLabels,
    fetchMlStatus,
    saveLabel,
    train,
  }
}
