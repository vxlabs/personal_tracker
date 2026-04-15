import { useState, useEffect, useRef, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import { TIMING_CONFIG } from '@/constants/timing'
import { istMinutesSinceMidnight } from '@/utils/istTime'
import type { NowResponse } from '@/types'

/** Parse "HH:mm" → total minutes from midnight */
function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number)
  return h * 60 + m
}

export function useCurrentBlock() {
  const [data, setData] = useState<NowResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  // Live minutes remaining — ticks every second, derived from block end time
  const [liveMinutes, setLiveMinutes] = useState<number | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchNow = useCallback(async () => {
    try {
      const res = await api.get<NowResponse>(API_ENDPOINTS.SCHEDULE_NOW)
      setData(res.data)
      setError(false)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  // Kick off polling on mount
  useEffect(() => {
    fetchNow()
    pollingRef.current = setInterval(fetchNow, TIMING_CONFIG.SCHEDULE_NOW_POLL_MS)
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [fetchNow])

  // Live 1-second countdown derived from the block's endTime in IST
  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current)

    if (!data?.currentBlock) {
      setLiveMinutes(null)
      return
    }

    const endMinutes = parseHHMM(data.currentBlock.endTime)

    const tick = () => {
      const remaining = endMinutes - istMinutesSinceMidnight()
      if (remaining <= 0) {
        setLiveMinutes(0)
        // Block has ended — re-poll immediately instead of waiting 30 s
        if (pollingRef.current) clearInterval(pollingRef.current)
        fetchNow().then(() => {
          pollingRef.current = setInterval(fetchNow, TIMING_CONFIG.SCHEDULE_NOW_POLL_MS)
        })
        if (tickRef.current) clearInterval(tickRef.current)
      } else {
        setLiveMinutes(Math.ceil(remaining))
      }
    }

    tick()
    tickRef.current = setInterval(tick, 1_000)
    return () => {
      if (tickRef.current) clearInterval(tickRef.current)
    }
  }, [data, fetchNow])

  return { data, loading, error, liveMinutes, refetch: fetchNow }
}
