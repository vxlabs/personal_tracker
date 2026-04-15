/* eslint-disable react-refresh/only-export-components -- provider + useXp hook */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { XpDelta, XpSummary } from '@/types'
import { RankUpOverlay } from '@/components/xp/RankUpOverlay'

type XpContextValue = {
  summary: XpSummary | null
  loading: boolean
  notifyXp: (delta: XpDelta | undefined) => void
}

const XpContext = createContext<XpContextValue | null>(null)

export function XpProvider({ children }: { children: ReactNode }) {
  const [summary, setSummary] = useState<XpSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [rankUp, setRankUp] = useState<{ from: string; to: string } | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await api.get<XpSummary>(API_ENDPOINTS.XP)
        if (!cancelled) setSummary(res.data)
      } catch {
        if (!cancelled) setSummary(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [version])

  const notifyXp = useCallback((delta: XpDelta | undefined) => {
    if (delta?.rankUp && delta.previousRankTitle) {
      setRankUp({ from: delta.previousRankTitle, to: delta.rankTitle })
    }
    setVersion((v) => v + 1)
  }, [])

  const dismissRankUp = useCallback(() => setRankUp(null), [])

  const value = useMemo(
    () => ({ summary, loading, notifyXp }),
    [summary, loading, notifyXp],
  )

  return (
    <XpContext.Provider value={value}>
      {children}
      {rankUp && <RankUpOverlay fromRank={rankUp.from} toRank={rankUp.to} onDismiss={dismissRankUp} />}
    </XpContext.Provider>
  )
}

export function useXp() {
  const ctx = useContext(XpContext)
  if (!ctx) throw new Error('useXp must be used within XpProvider')
  return ctx
}
