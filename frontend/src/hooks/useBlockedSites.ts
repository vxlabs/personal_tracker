import { useState, useEffect, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { BlockedSiteDto } from '@/types'

interface UseBlockedSitesReturn {
  sites: BlockedSiteDto[]
  loading: boolean
  add: (domain: string) => Promise<void>
  remove: (id: number) => Promise<void>
  toggle: (id: number) => Promise<void>
  refetch: () => Promise<void>
}

export function useBlockedSites(): UseBlockedSitesReturn {
  const [sites, setSites] = useState<BlockedSiteDto[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const res = await api.get<BlockedSiteDto[]>(API_ENDPOINTS.BLOCKED_SITES)
      setSites(res.data)
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const add = useCallback(async (domain: string) => {
    const res = await api.post<BlockedSiteDto>(API_ENDPOINTS.BLOCKED_SITES, { domain })
    setSites((prev) => [...prev, res.data].sort((a, b) => a.domain.localeCompare(b.domain)))
  }, [])

  const remove = useCallback(async (id: number) => {
    await api.delete(API_ENDPOINTS.blockedSiteDelete(id))
    setSites((prev) => prev.filter((s) => s.id !== id))
  }, [])

  const toggle = useCallback(async (id: number) => {
    const res = await api.put<BlockedSiteDto>(API_ENDPOINTS.blockedSiteToggle(id))
    setSites((prev) => prev.map((s) => (s.id === id ? res.data : s)))
  }, [])

  return { sites, loading, add, remove, toggle, refetch: fetch }
}
