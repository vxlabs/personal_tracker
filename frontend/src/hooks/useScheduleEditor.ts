import { useState, useCallback } from 'react'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'
import type { BlockDto, BlockInput, DayOfWeek } from '@/types'

export function useScheduleEditor() {
  const [blocks, setBlocks] = useState<BlockInput[]>([])
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>('monday')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const fetchDay = useCallback(async (day: DayOfWeek) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await api.get<BlockDto[]>(API_ENDPOINTS.scheduleDay(day))
      setBlocks(res.data.map(dtoToInput))
      setSelectedDay(day)
    } catch {
      setError('Failed to load schedule')
    } finally {
      setLoading(false)
    }
  }, [])

  const saveDay = useCallback(async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      const res = await api.put<BlockDto[]>(
        API_ENDPOINTS.scheduleDay(selectedDay),
        blocks
      )
      setBlocks(res.data.map(dtoToInput))
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: unknown) {
      const msg = extractError(err)
      setError(msg)
    } finally {
      setSaving(false)
    }
  }, [selectedDay, blocks])

  const duplicateDay = useCallback(async (fromDay: DayOfWeek, toDay: DayOfWeek) => {
    setSaving(true)
    setError(null)
    setSuccess(false)
    try {
      await api.post(API_ENDPOINTS.SCHEDULE_DUPLICATE, {
        fromDay,
        toDay,
      })
      setSuccess(true)
      setTimeout(() => setSuccess(false), 2000)
    } catch (err: unknown) {
      setError(extractError(err))
    } finally {
      setSaving(false)
    }
  }, [])

  const addBlock = useCallback(() => {
    const last = blocks[blocks.length - 1]
    const startTime = last?.endTime ?? '09:00'
    const [h, m] = startTime.split(':').map(Number)
    const endH = h + 1 > 23 ? 23 : h + 1
    const endTime = `${String(endH).padStart(2, '0')}:${String(m).padStart(2, '0')}`

    setBlocks(prev => [...prev, {
      startTime,
      endTime,
      type: 'work',
      label: 'New Block',
      note: null,
      isFocusBlock: false,
    }])
  }, [blocks])

  const removeBlock = useCallback((index: number) => {
    setBlocks(prev => prev.filter((_, i) => i !== index))
  }, [])

  const updateBlock = useCallback((index: number, updates: Partial<BlockInput>) => {
    setBlocks(prev => prev.map((b, i) => i === index ? { ...b, ...updates } : b))
  }, [])

  const moveBlock = useCallback((index: number, direction: 'up' | 'down') => {
    setBlocks(prev => {
      const next = [...prev]
      const target = direction === 'up' ? index - 1 : index + 1
      if (target < 0 || target >= next.length) return prev
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }, [])

  return {
    blocks,
    selectedDay,
    loading,
    saving,
    error,
    success,
    fetchDay,
    saveDay,
    duplicateDay,
    addBlock,
    removeBlock,
    updateBlock,
    moveBlock,
  }
}

function dtoToInput(dto: BlockDto): BlockInput {
  return {
    startTime: dto.startTime,
    endTime: dto.endTime,
    type: dto.type,
    label: dto.label,
    note: dto.note,
    isFocusBlock: dto.isFocusBlock,
  }
}

function extractError(err: unknown): string {
  if (err && typeof err === 'object' && 'response' in err) {
    const resp = (err as { response?: { data?: { error?: string } } }).response
    if (resp?.data?.error) return resp.data.error
  }
  return 'Failed to save schedule'
}
