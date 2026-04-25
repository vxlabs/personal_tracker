import { useState } from 'react'
import { AlertCircle, RefreshCw, Loader2, Zap, X } from 'lucide-react'
import { useWikiStats, useWikiSources, useWikiRecent, useWikiAgentStatus } from '@/hooks/useWiki'
import { QuickCapture } from '@/components/wiki/QuickCapture'
import { SourceCard } from '@/components/wiki/SourceCard'
import { WikiStatsPanel } from '@/components/wiki/WikiStatsPanel'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'

interface XpToast {
  id: number
  xpGained: number
  rankUp: boolean
  rankTitle: string
}

export function WikiDashboard() {
  const { stats, loading: statsLoading, refresh: refreshStats } = useWikiStats()
  const { sources, loading: sourcesLoading, refresh: refreshSources, capture, deleteSource, compile } = useWikiSources()
  const { pages: recentPages, loading: recentLoading } = useWikiRecent()
  const { status: agentStatus } = useWikiAgentStatus()
  const [compilingId, setCompilingId] = useState<number | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [xpToasts, setXpToasts] = useState<XpToast[]>([])
  const [compileError, setCompileError] = useState<string | null>(null)

  const showXpToast = (xp: { xpGainedThisAction: number; rankUp: boolean; rankTitle: string }) => {
    if (!xp.xpGainedThisAction) return
    const id = Date.now()
    setXpToasts(prev => [...prev, { id, xpGained: xp.xpGainedThisAction, rankUp: xp.rankUp, rankTitle: xp.rankTitle }])
    setTimeout(() => setXpToasts(prev => prev.filter(t => t.id !== id)), 3500)
  }

  const handleCompile = async (id: number) => {
    setCompilingId(id)
    setCompileError(null)
    try {
      const xp = await compile(id)
      await refreshStats()
      if (xp) showXpToast(xp)
    } catch (err: unknown) {
      const axiosData = (err as { response?: { data?: { error?: string; detail?: string } } })?.response?.data
      const message =
        axiosData?.error ??
        axiosData?.detail ??
        (err instanceof Error ? err.message : null) ??
        'Compile failed. Check wiki agent configuration.'
      setCompileError(message)
      await refreshStats()
    } finally {
      setCompilingId(null)
    }
  }

  const handleCapture = async (req: Parameters<typeof capture>[0]) => {
    const xp = await capture(req)
    if (xp) showXpToast(xp)
    return xp
  }

  const handleSync = async () => {
    setSyncing(true)
    try {
      await api.post(API_ENDPOINTS.WIKI_SYNC)
      await refreshStats()
      await refreshSources()
    } finally {
      setSyncing(false)
    }
  }

  const pendingCount = sources.filter(s => s.status === 'captured').length
  const failedCount = sources.filter(s => s.status === 'error').length
  const processableSources = sources.filter(s => s.status === 'captured' || s.status === 'error')
  const failedSources = sources.filter(s => s.status === 'error')

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto p-1">
      {/* XP Toast Stack */}
      {xpToasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none">
          {xpToasts.map(toast => (
            <div
              key={toast.id}
              className="flex items-center gap-2 rounded-xl border border-accent-purple/40 bg-surface shadow-lg px-4 py-2.5 text-sm animate-in slide-in-from-right"
            >
              <Zap className="h-4 w-4 text-accent-purple" />
              <span className="font-bold text-accent-purple">+{toast.xpGained} XP</span>
              {toast.rankUp && (
                <span className="text-text-primary">🎖 Rank up → {toast.rankTitle}</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Compile Error Banner */}
      {compileError && (
        <div className="rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 flex items-start justify-between gap-3">
          <div className="flex items-start gap-2 min-w-0">
            <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-red-300 mb-0.5">Compile failed</p>
              <p className="text-xs text-red-300/80 break-words">{compileError}</p>
            </div>
          </div>
          <button
            onClick={() => setCompileError(null)}
            className="shrink-0 text-red-400/60 hover:text-red-300 transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-sans text-base font-bold text-text-primary">Knowledge Wiki</h1>
          <p className="text-xs text-text-dim">Karpathy LLM Wiki pattern — capture, compile, connect</p>
        </div>
        <div className="flex items-center gap-2">
          {pendingCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-accent-purple/10 px-2.5 py-1 text-xs font-medium text-accent-purple">
              {pendingCount} pending
            </span>
          )}
          {failedCount > 0 && (
            <span className="flex items-center gap-1 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-300">
              {failedCount} failed
            </span>
          )}
          {agentStatus?.profile && (
            <span className="rounded-full border border-border bg-surface-2 px-2.5 py-1 text-xs text-text-dim">
              Agent: <span className="text-text-primary">{agentStatus.profile.name}</span>
            </span>
          )}
          <button
            onClick={handleSync}
            disabled={syncing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-surface-2 text-xs font-medium text-text-dim hover:text-text-primary hover:border-accent-purple/50 disabled:opacity-50 transition-colors"
          >
            {syncing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Sync Index
          </button>
        </div>
      </div>

      {/* Stats */}
      {statsLoading ? (
        <div className="h-20 flex items-center justify-center text-text-dim text-xs">
          <Loader2 className="h-4 w-4 animate-spin mr-2" /> Loading stats...
        </div>
      ) : stats ? (
        <WikiStatsPanel stats={stats} />
      ) : null}

      {/* Schedule prompt: compile pending sources */}
      {!statsLoading && processableSources.length > 0 && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-amber-400 shrink-0" />
            <p className="text-xs text-amber-300">
              <span className="font-semibold">{processableSources.length} source{processableSources.length > 1 ? 's' : ''}</span> waiting to be processed.
              Earn <span className="font-bold">+{processableSources.length * 30} XP</span> by compiling all.
            </p>
          </div>
          <div className="shrink-0 ml-3 flex items-center gap-2">
            {failedCount > 0 && (
              <button
                onClick={async () => {
                  for (const source of failedSources) {
                    await handleCompile(source.id)
                  }
                }}
                disabled={compilingId !== null}
                className="flex items-center gap-1 px-3 py-1 rounded-lg border border-red-400/30 bg-red-400/10 hover:bg-red-400/20 text-red-300 text-xs font-medium transition-colors disabled:opacity-50"
              >
                <AlertCircle className="h-3.5 w-3.5" />
                Retry failed
              </button>
            )}
            <button
              onClick={async () => {
                for (const source of processableSources) {
                  await handleCompile(source.id)
                }
              }}
              disabled={compilingId !== null}
              className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-medium transition-colors disabled:opacity-50"
            >
              Compile all
            </button>
          </div>
        </div>
      )}

      {/* Quick Capture */}
      <QuickCapture onCapture={handleCapture} />

      {/* Sources Queue */}
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-sans text-sm font-semibold text-text-primary">
            Sources Queue
          </h2>
          <span className="text-xs text-text-dim">{sources.length} sources</span>
        </div>
        {sourcesLoading ? (
          <div className="flex items-center justify-center py-8 text-text-dim text-xs">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading sources...
          </div>
        ) : sources.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-6">
            No sources yet. Capture a URL or note above.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {sources.map(source => (
              <SourceCard
                key={source.id}
                source={source}
                onDelete={() => deleteSource(source.id)}
                onCompile={() => handleCompile(source.id)}
                compiling={compilingId === source.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* Recently Updated Pages */}
      <div className="rounded-xl border border-border bg-surface-1 p-4">
        <h2 className="font-sans text-sm font-semibold text-text-primary mb-3">
          Recently Updated
        </h2>
        {recentLoading ? (
          <div className="flex items-center justify-center py-6 text-text-dim text-xs">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...
          </div>
        ) : recentPages.length === 0 ? (
          <p className="text-xs text-text-dim text-center py-4">
            No wiki pages yet. Compile a source to create your first page.
          </p>
        ) : (
          <div className="space-y-1.5">
            {recentPages.map(page => (
              <div key={page.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text-primary truncate">{page.title}</p>
                  <p className="text-xs text-text-dim truncate">{page.filePath}</p>
                </div>
                <div className="ml-3 flex items-center gap-2 shrink-0">
                  <span className="text-[10px] text-text-dim bg-surface-2 border border-border px-1.5 py-0.5 rounded-full capitalize">
                    {page.pageType}
                  </span>
                  <span className="text-[10px] text-text-dim">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
