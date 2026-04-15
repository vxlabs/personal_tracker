import { useState, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { ReviewSearchResult } from '@/types'

interface UseReviewSearchReturn {
  results: ReviewSearchResult[]
  loading: boolean
  searched: boolean
  search: (query: string) => Promise<void>
  clear: () => void
}

export function useReviewSearch(): UseReviewSearchReturn {
  const [results, setResults] = useState<ReviewSearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      setSearched(false)
      return
    }
    setLoading(true)
    try {
      const res = await api.get<ReviewSearchResult[]>(API_ENDPOINTS.REVIEW_SEARCH, {
        params: { q: query },
      })
      setResults(res.data)
      setSearched(true)
    } catch {
      setResults([])
    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setResults([])
    setSearched(false)
  }, [])

  return { results, loading, searched, search, clear }
}
