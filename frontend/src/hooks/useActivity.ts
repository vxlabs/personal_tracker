import { useCallback, useState } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { ActivitySummary, ActivityTrainResult, ProductivityLabel } from '@/types'

export function useActivity() {
  const [summary, setSummary] = useState<ActivitySummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [training, setTraining] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [trainResult, setTrainResult] = useState<ActivityTrainResult | null>(null)

  const fetchSummary = useCallback(async (period: 'today' | 'week') => {
    setLoading(true)
    setError(null)
    try {
      const res = await api.get<ActivitySummary>(API_ENDPOINTS.ACTIVITY_SUMMARY, {
        params: { period },
      })
      setSummary(res.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load activity')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveLabel = useCallback(async ({
    label,
    scope,
    domain,
    url,
  }: {
    label: Exclude<ProductivityLabel, 'Unclassified'>
    scope: 'url' | 'domain'
    domain: string
    url?: string | null
  }) => {
    setSaving(true)
    setError(null)
    try {
      await api.put(API_ENDPOINTS.ACTIVITY_LABELS, {
        scope,
        target: scope === 'domain' ? domain : url,
        domain,
        url,
        label,
      })
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
      const res = await api.post<ActivityTrainResult>(API_ENDPOINTS.ACTIVITY_TRAIN)
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
    loading,
    saving,
    training,
    error,
    trainResult,
    fetchSummary,
    saveLabel,
    train,
  }
}
