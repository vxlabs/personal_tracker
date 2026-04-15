import { useState, useEffect } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import { useXp } from '@/context/XpContext'
import type { HabitStatus, XpDelta } from '@/types'

interface HabitToggleResponse {
  habit: HabitStatus
  xp: XpDelta
}

export function useHabits() {
  const { notifyXp } = useXp()
  const [habits, setHabits] = useState<HabitStatus[]>([])
  const [loading, setLoading] = useState(true)

  const fetchHabits = async () => {
    try {
      const res = await api.get<HabitStatus[]>(API_ENDPOINTS.HABITS_TODAY)
      setHabits(res.data)
    } catch {
      // silently fail — UI shows stale data
    } finally {
      setLoading(false)
    }
  }

  const toggle = async (habitId: number, currentlyCompleted: boolean) => {
    setHabits((prev) =>
      prev.map((h) => (h.habitId === habitId ? { ...h, isCompletedToday: !currentlyCompleted } : h)),
    )

    try {
      if (currentlyCompleted) {
        const res = await api.delete<HabitToggleResponse>(API_ENDPOINTS.habitCheck(habitId))
        setHabits((prev) => prev.map((h) => (h.habitId === habitId ? res.data.habit : h)))
        notifyXp(res.data.xp)
      } else {
        const res = await api.post<HabitToggleResponse>(API_ENDPOINTS.habitCheck(habitId))
        setHabits((prev) => prev.map((h) => (h.habitId === habitId ? res.data.habit : h)))
        notifyXp(res.data.xp)
      }
    } catch {
      fetchHabits()
    }
  }

  useEffect(() => {
    fetchHabits()
  }, [])

  return { habits, loading, toggle, refetch: fetchHabits }
}
