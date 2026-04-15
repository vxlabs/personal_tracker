import { useState } from 'react'
import { ShieldAlert, Plus, Trash2, Loader2 } from 'lucide-react'
import { useBlockedSites } from '@/hooks/useBlockedSites'

export function BlockedSitesSettings() {
  const { sites, loading, add, remove, toggle } = useBlockedSites()
  const [domain, setDomain] = useState('')
  const [adding, setAdding] = useState(false)
  const [error, setError] = useState('')

  const handleAdd = async () => {
    const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '')
    if (!cleaned) return

    setAdding(true)
    setError('')
    try {
      await add(cleaned)
      setDomain('')
    } catch {
      setError('Domain already exists or invalid')
    } finally {
      setAdding(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleAdd()
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-5">
      <div className="flex items-center gap-3">
        <ShieldAlert className="h-5 w-5 text-red-400" />
        <h2 className="font-sans text-base font-semibold text-text-primary">Blocked Sites</h2>
      </div>

      <p className="text-xs font-mono text-text-dim">
        Sites to avoid during focus sessions. Shown as a reminder panel in Focus Mode.
      </p>

      {/* Add domain input */}
      <div className="flex gap-2">
        <input
          type="text"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="e.g. tiktok.com"
          className="flex-1 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-sm text-text-primary placeholder:text-text-dim/50 focus:outline-none focus:border-red-400/60 transition-colors"
        />
        <button
          onClick={handleAdd}
          disabled={adding || !domain.trim()}
          className="flex items-center gap-1.5 rounded-md bg-red-400/15 border border-red-400/30 px-3 py-2 font-mono text-sm text-red-400 hover:bg-red-400/25 transition-colors disabled:opacity-40"
        >
          {adding ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
          Add
        </button>
      </div>

      {error && (
        <p className="text-xs text-red-400 font-mono">{error}</p>
      )}

      {/* Sites list */}
      {loading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
        </div>
      ) : sites.length === 0 ? (
        <p className="text-sm text-text-dim text-center py-3">No blocked sites configured</p>
      ) : (
        <div className="space-y-2">
          {sites.map((site) => (
            <div
              key={site.id}
              className="flex items-center justify-between rounded-md border border-border bg-surface-2 px-3 py-2.5"
            >
              <div className="flex items-center gap-3 min-w-0">
                {/* Active toggle */}
                <button onClick={() => toggle(site.id)} className="relative shrink-0">
                  <div className={`w-8 h-4.5 rounded-full transition-colors ${site.isActive ? 'bg-red-400' : 'bg-border'}`} />
                  <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full transition-all ${site.isActive ? 'bg-white translate-x-3.5' : 'bg-text-dim'}`} />
                </button>

                <span className={`font-mono text-sm truncate ${site.isActive ? 'text-text-primary' : 'text-text-dim line-through'}`}>
                  {site.domain}
                </span>
              </div>

              <button
                onClick={() => remove(site.id)}
                className="shrink-0 ml-2 p-1 text-text-dim hover:text-red-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}
