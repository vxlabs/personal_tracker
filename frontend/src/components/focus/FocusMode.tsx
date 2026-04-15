import { useState, useEffect, useCallback } from 'react'
import { X, Coffee } from 'lucide-react'
import { FocusTimer } from './FocusTimer'
import { BlockedSitesPanel } from './BlockedSitesPanel'
import { blockColor } from '@/utils/blockColors'
import { TIMING_CONFIG } from '@/constants/timing'
import type { FocusSessionDto, NowResponse, BlockedSiteDto } from '@/types'

interface FocusModeProps {
  session: FocusSessionDto
  elapsedSeconds: number
  nowData: NowResponse | null
  blockedSites: BlockedSiteDto[]
  blockedSitesLoading: boolean
  onStop: () => Promise<void>
}

export function FocusMode({ session, elapsedSeconds, nowData, blockedSites, blockedSitesLoading, onStop }: FocusModeProps) {
  const [stopping, setStopping] = useState(false)
  const [onBreak, setOnBreak] = useState(false)
  const [breakSeconds, setBreakSeconds] = useState<number>(TIMING_CONFIG.FOCUS_BREAK_DURATION_S)

  const color = blockColor(session.blockType)

  // Compute remaining seconds in the current block
  const remainingInBlock = nowData?.minutesRemaining != null
    ? Math.max(0, nowData.minutesRemaining * 60 - (elapsedSeconds % 60))
    : null

  // Break countdown
  useEffect(() => {
    if (!onBreak) return
    if (breakSeconds <= 0) {
      setOnBreak(false)
      setBreakSeconds(TIMING_CONFIG.FOCUS_BREAK_DURATION_S)
      return
    }
    const id = setInterval(() => {
      setBreakSeconds((s) => {
        if (s <= 1) {
          setOnBreak(false)
          return TIMING_CONFIG.FOCUS_BREAK_DURATION_S
        }
        return s - 1
      })
    }, TIMING_CONFIG.FOCUS_TIMER_TICK_MS)
    return () => clearInterval(id)
  }, [onBreak, breakSeconds])

  const handleStop = useCallback(async () => {
    setStopping(true)
    try {
      await onStop()
    } finally {
      setStopping(false)
    }
  }, [onStop])

  const handleBreak = useCallback(() => {
    setOnBreak(true)
    setBreakSeconds(TIMING_CONFIG.FOCUS_BREAK_DURATION_S)
  }, [])

  const handleResumeFromBreak = useCallback(() => {
    setOnBreak(false)
    setBreakSeconds(TIMING_CONFIG.FOCUS_BREAK_DURATION_S)
  }, [])

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background: `radial-gradient(ellipse at center, ${color}0a 0%, var(--color-bg) 70%)`,
        backgroundColor: 'var(--color-bg)',
      }}
    >
      {/* End session button — top right */}
      <button
        onClick={handleStop}
        disabled={stopping}
        className="absolute top-5 right-5 flex items-center gap-1.5 font-sans text-sm text-text-dim hover:text-text-secondary transition-colors px-3 py-1.5 rounded border border-border hover:border-text-dim"
      >
        <X size={14} />
        {stopping ? 'Ending…' : 'End Session'}
      </button>

      {/* Block type badge */}
      <div className="flex flex-col items-center gap-6">
        <span
          className="font-mono text-xs font-semibold px-3 py-1 rounded-full border"
          style={{ color, borderColor: `${color}50`, background: `${color}12` }}
        >
          {session.blockType.toUpperCase()}
        </span>

        {/* Task name */}
        <h1
          className="font-sans text-3xl md:text-4xl font-semibold text-text-primary text-center px-8 max-w-xl"
          style={{ textShadow: `0 0 40px ${color}30` }}
        >
          {session.blockLabel}
        </h1>

        {/* Breathing pulse ring */}
        <div className="relative flex items-center justify-center my-4">
          {/* Outer breathing ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 180,
              height: 180,
              border: `1px solid ${color}30`,
              animation: 'breathe 4s ease-in-out infinite',
            }}
          />
          {/* Middle ring */}
          <div
            className="absolute rounded-full"
            style={{
              width: 140,
              height: 140,
              border: `1px solid ${color}50`,
              animation: 'breathe 4s ease-in-out infinite 0.5s',
            }}
          />
          {/* Core dot */}
          <div
            className="rounded-full"
            style={{
              width: 12,
              height: 12,
              background: color,
              boxShadow: `0 0 20px ${color}80`,
            }}
          />
        </div>

        {/* Timers row */}
        {onBreak ? (
          <div className="flex flex-col items-center gap-3">
            <FocusTimer seconds={breakSeconds} label="break remaining" variant="down" size="lg" />
            <button
              onClick={handleResumeFromBreak}
              className="font-sans text-sm text-text-dim hover:text-text-secondary transition-colors mt-2"
            >
              Resume now →
            </button>
          </div>
        ) : (
          <div className="flex items-start gap-12">
            <FocusTimer seconds={elapsedSeconds} label="elapsed" variant="up" size="lg" />
            {remainingInBlock != null && (
              <FocusTimer seconds={remainingInBlock} label="in block" variant="down" size="lg" />
            )}
          </div>
        )}

        {/* Break button */}
        {!onBreak && (
          <button
            onClick={handleBreak}
            className="mt-4 flex items-center gap-2 font-sans text-sm text-text-dim hover:text-text-secondary transition-colors px-4 py-2 rounded border border-border/60 hover:border-border"
          >
            <Coffee size={14} />
            I need a break
          </button>
        )}
      </div>

      {/* Blocked sites advisory panel */}
      <BlockedSitesPanel
        sites={blockedSites}
        loading={blockedSitesLoading}
        accentColor={color}
      />

      {/* Breathe keyframe */}
      <style>{`
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.6; }
          50% { transform: scale(1.15); opacity: 1; }
        }
      `}</style>
    </div>
  )
}
