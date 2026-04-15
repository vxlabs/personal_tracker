import { useState, useEffect, useCallback, useRef } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import { TIMING_CONFIG } from '@/constants/timing'
import { useXp } from '@/context/XpContext'
import type { FocusSessionDto, FocusCurrentResponse, XpDelta } from '@/types'

interface UseFocusSessionReturn {
  session: FocusSessionDto | null
  elapsedSeconds: number
  loading: boolean
  error: boolean
  start: () => Promise<void>
  stop: () => Promise<void>
}

interface FocusStopBody {
  session: FocusSessionDto
  xp: XpDelta
}

export function useFocusSession(): UseFocusSessionReturn {
  const { notifyXp } = useXp()
  const [session, setSession] = useState<FocusSessionDto | null>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  // Track elapsed via a ref so the interval always reads the latest startedAt
  const startedAtRef = useRef<string | null>(null)

  const computeElapsed = useCallback(() => {
    if (!startedAtRef.current) return 0
    const started = new Date(startedAtRef.current).getTime()
    return Math.floor((Date.now() - started) / 1000)
  }, [])

  const fetchCurrent = useCallback(async () => {
    try {
      const res = await api.get<FocusCurrentResponse>(API_ENDPOINTS.FOCUS_CURRENT)
      const { session: s } = res.data
      setSession(s)
      startedAtRef.current = s?.startedAt ?? null
      setElapsedSeconds(s ? computeElapsed() : 0)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [computeElapsed])

  // Restore active session on mount + poll every 30s for server sync
  useEffect(() => {
    fetchCurrent()
    const pollId = setInterval(fetchCurrent, TIMING_CONFIG.FOCUS_CURRENT_POLL_MS)
    return () => clearInterval(pollId)
  }, [fetchCurrent])

  // 1-second elapsed tick when session is active
  useEffect(() => {
    if (!session?.isActive) return
    const tickId = setInterval(() => {
      setElapsedSeconds(computeElapsed())
    }, TIMING_CONFIG.FOCUS_TIMER_TICK_MS)
    return () => clearInterval(tickId)
  }, [session?.isActive, computeElapsed])

  const start = useCallback(async () => {
    const res = await api.post<FocusSessionDto>(API_ENDPOINTS.FOCUS_START)
    setSession(res.data)
    startedAtRef.current = res.data.startedAt
    setElapsedSeconds(0)
    setError(false)
  }, [])

  const stop = useCallback(async () => {
    const res = await api.post<FocusStopBody>(API_ENDPOINTS.FOCUS_STOP)
    setSession(res.data.session)
    notifyXp(res.data.xp)
    startedAtRef.current = null
    setElapsedSeconds(0)
    setError(false)
  }, [notifyXp])

  return { session, elapsedSeconds, loading, error, start, stop }
}
