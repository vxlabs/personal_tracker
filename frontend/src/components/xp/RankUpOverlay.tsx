import { useEffect } from 'react'
import { Sparkles } from 'lucide-react'
import { TIMING_CONFIG } from '@/constants/timing'

type Props = {
  fromRank: string
  toRank: string
  onDismiss: () => void
}

export function RankUpOverlay({ fromRank, toRank, onDismiss }: Props) {
  useEffect(() => {
    const id = window.setTimeout(onDismiss, TIMING_CONFIG.RANK_UP_TOAST_MS)
    return () => window.clearTimeout(id)
  }, [onDismiss])

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-bg/80 backdrop-blur-sm"
      role="dialog"
      aria-labelledby="rank-up-title"
      aria-modal="true"
    >
      <div className="relative mx-4 max-w-sm rounded-2xl border border-accent-purple/30 bg-surface-1 px-8 py-10 shadow-2xl shadow-accent-purple/20">
        <div className="flex justify-center mb-4">
          <div className="rounded-full bg-accent-purple/15 p-4 ring-2 ring-accent-purple/40">
            <Sparkles className="h-10 w-10 text-accent-purple" aria-hidden />
          </div>
        </div>
        <p id="rank-up-title" className="text-center font-sans text-lg font-semibold text-text-primary">
          Rank up!
        </p>
        <p className="mt-2 text-center text-sm text-text-dim">
          <span className="line-through opacity-70">{fromRank}</span>
          <span className="mx-2 text-text-dim">→</span>
          <span className="font-semibold text-accent-purple">{toRank}</span>
        </p>
        <button
          type="button"
          onClick={onDismiss}
          className="mt-8 w-full rounded-lg bg-accent-purple/90 py-2.5 text-sm font-medium text-white hover:bg-accent-purple transition-colors"
        >
          Continue
        </button>
      </div>
    </div>
  )
}
