import { FolderOpen, Loader2, RefreshCw, Database } from 'lucide-react'
import { useVaultInfo } from '@/hooks/useWiki'
import { isDesktopRuntime } from '@/runtime/config'

const SUBFOLDER_LABELS: Record<string, string> = {
  entities: 'Entities',
  concepts: 'Concepts',
  topics: 'Topics',
  sources: 'Sources',
  syntheses: 'Syntheses',
}

export function VaultSettings() {
  const { info, loading, error, refresh } = useVaultInfo()
  const isDesktop = isDesktopRuntime()

  const handleOpenFolder = (folderPath: string) => {
    window.protocolDesktop?.openFolder?.(folderPath)
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Database className="h-5 w-5 text-accent-purple" />
          <div>
            <h2 className="font-sans text-base font-semibold text-text-primary">Vault &amp; Wiki Folder</h2>
            <p className="text-xs font-mono text-text-dim">Where your wiki files are stored on disk</p>
          </div>
        </div>
        <button
          onClick={refresh}
          disabled={loading}
          className="rounded-md border border-border p-1.5 text-text-dim hover:text-text-primary hover:border-accent-purple/40 transition-colors disabled:opacity-50"
          aria-label="Refresh vault info"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !info ? (
        <div className="flex items-center justify-center py-6">
          <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
        </div>
      ) : error ? (
        <p className="text-sm font-mono text-red-400">{error}</p>
      ) : info ? (
        <div className="space-y-4">
          {/* Vault root path */}
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-wide text-text-dim">Vault root</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <p className="flex-1 truncate font-mono text-sm text-text-primary" title={info.vaultRoot}>
                {info.vaultRoot}
              </p>
              {isDesktop && (
                <button
                  onClick={() => handleOpenFolder(info.vaultRoot)}
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-mono text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple transition-colors"
                >
                  <FolderOpen className="h-3 w-3" />
                  Open
                </button>
              )}
            </div>
          </div>

          {/* Wiki dir path */}
          <div className="space-y-1.5">
            <p className="text-xs font-mono uppercase tracking-wide text-text-dim">Wiki directory</p>
            <div className="flex items-center gap-2 rounded-md border border-border bg-surface-2 px-3 py-2">
              <p className="flex-1 truncate font-mono text-sm text-text-primary" title={info.wikiDir}>
                {info.wikiDir}
              </p>
              {isDesktop && (
                <button
                  onClick={() => handleOpenFolder(info.wikiDir)}
                  className="shrink-0 flex items-center gap-1.5 rounded-md border border-border px-2 py-1 text-[11px] font-mono text-text-secondary hover:border-accent-purple/40 hover:text-accent-purple transition-colors"
                >
                  <FolderOpen className="h-3 w-3" />
                  Open
                </button>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* Subfolder breakdown */}
          <div className="space-y-2">
            <p className="text-xs font-mono uppercase tracking-wide text-text-dim">
              Wiki pages — {info.totalPages} total
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
              {Object.entries(info.subfolders).map(([key, count]) => (
                <div
                  key={key}
                  className="rounded-md border border-border bg-surface-2 px-3 py-2 text-center"
                >
                  <p className="text-lg font-semibold text-text-primary">{count}</p>
                  <p className="text-[11px] font-mono text-text-dim capitalize">
                    {SUBFOLDER_LABELS[key] ?? key}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
