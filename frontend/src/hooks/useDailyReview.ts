import { useState, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import { useXp } from '@/context/XpContext'
import type { DailyReviewDto, XpDelta } from '@/types'

interface ReviewSaveBody {
  review: DailyReviewDto
  xp: XpDelta
}

interface UseDailyReviewReturn {
  review: DailyReviewDto | null
  loading: boolean
  saving: boolean
  error: boolean
  fetchReview: (date: string) => Promise<void>
  saveReview: (date: string, entry1: string, entry2: string, entry3: string) => Promise<DailyReviewDto>
}

export function useDailyReview(): UseDailyReviewReturn {
  const { notifyXp } = useXp()
  const [review, setReview] = useState<DailyReviewDto | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(false)

  const fetchReview = useCallback(async (date: string) => {
    setLoading(true)
    setError(false)
    try {
      const res = await api.get<DailyReviewDto | null>(API_ENDPOINTS.reviewByDate(date))
      setReview(res.data)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  const saveReview = useCallback(async (date: string, entry1: string, entry2: string, entry3: string) => {
    setSaving(true)
    setError(false)
    try {
      const res = await api.post<ReviewSaveBody>(API_ENDPOINTS.REVIEW, { date, entry1, entry2, entry3 })
      setReview(res.data.review)
      notifyXp(res.data.xp)
      return res.data.review
    } catch {
      setError(true)
      throw new Error('Failed to save review')
    } finally {
      setSaving(false)
    }
  }, [notifyXp])

  return { review, loading, saving, error, fetchReview, saveReview }
}
