import { Crosshair, Play } from 'lucide-react'
import { useFocusSession } from '@/hooks/useFocusSession'
import { useFocusHistory } from '@/hooks/useFocusHistory'
import { useCurrentBlock } from '@/hooks/useCurrentBlock'
import { useBlockedSites } from '@/hooks/useBlockedSites'
import { FocusMode } from '@/components/focus/FocusMode'
import { FocusHistory } from '@/components/focus/FocusHistory'
import { blockColor } from '@/utils/blockColors'
import { BlockTypeIcon } from '@/utils/blockTypeIcon'

export function Focus() {
  const { session, elapsedSeconds, loading, start, stop } = useFocusSession()
  const { sessions, loading: historyLoading, refetch: refetchHistory } = useFocusHistory()
  const { data: nowData } = useCurrentBlock()
  const { sites: blockedSites, loading: blockedSitesLoading } = useBlockedSites()

  const isActive = session?.isActive === true

  // When session ends, refresh history
  const handleStop = async () => {
    await stop()
    await refetchHistory()
  }

  // Active session: render immersive overlay
  if (isActive && session) {
    return (
      <FocusMode
        session={session}
        elapsedSeconds={elapsedSeconds}
        nowData={nowData}
        blockedSites={blockedSites}
        blockedSitesLoading={blockedSitesLoading}
        onStop={handleStop}
      />
    )
  }

  const currentBlock = nowData?.currentBlock
  const isFocusBlock = currentBlock?.isFocusBlock ?? false
  const blockAccent = currentBlock ? blockColor(currentBlock.type) : '#7a7a90'

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <Crosshair className="h-5 w-5 text-block-ml" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Focus Mode</h1>
      </div>

      {/* Session start card */}
      <div className="rounded-xl border border-border bg-surface-1 px-6 py-6">
        {loading ? (
          <div className="h-20 animate-pulse rounded-lg bg-surface-2" />
        ) : (
          <div className="flex flex-col gap-5">
            {/* Current block context */}
            {currentBlock ? (
              <div
                className="rounded-lg border px-4 py-3 flex items-center gap-3"
                style={{ borderColor: `${blockAccent}40`, background: `${blockAccent}08` }}
              >
                <span className="shrink-0" style={{ color: blockAccent }}>
                  <BlockTypeIcon type={currentBlock.type} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-sans text-sm font-medium text-text-primary">{currentBlock.label}</p>
                  <p className="font-mono text-xs text-text-dim">
                    {currentBlock.startTime}–{currentBlock.endTime}
                    {isFocusBlock && (
                      <span className="ml-2" style={{ color: blockAccent }}>· Focus block</span>
                    )}
                  </p>
                </div>
                {isFocusBlock && (
                  <span
                    className="font-mono text-xs px-2 py-0.5 rounded font-semibold"
                    style={{ color: blockAccent, background: `${blockAccent}18` }}
                  >
                    FOCUS
                  </span>
                )}
              </div>
            ) : (
              <p className="font-sans text-sm text-text-dim">No active schedule block right now.</p>
            )}

            {/* Auto-suggest for focus blocks */}
            {isFocusBlock && (
              <p className="font-sans text-sm text-text-secondary">
                You're in a focus block — start a session to track your progress.
              </p>
            )}

            {/* Start button */}
            <button
              onClick={start}
              className="flex items-center justify-center gap-2 rounded-lg px-5 py-3 font-sans text-sm font-semibold text-bg transition-all hover:opacity-90 active:scale-95"
              style={{ background: isFocusBlock ? blockAccent : 'var(--color-accent-cyan)' }}
            >
              <Play size={15} />
              Start Focus Session
            </button>
          </div>
        )}
      </div>

      {/* History */}
      <div className="space-y-3">
        <h2 className="font-sans text-sm font-semibold text-text-secondary uppercase tracking-wider">
          Session History
        </h2>
        <FocusHistory sessions={sessions} loading={historyLoading} />
      </div>
    </div>
  )
}
