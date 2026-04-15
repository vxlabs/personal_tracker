import { useState, useRef } from 'react'
import { Search, X, Loader2 } from 'lucide-react'
import type { ReviewSearchResult } from '@/types'

interface Props {
  results: ReviewSearchResult[]
  loading: boolean
  searched: boolean
  onSearch: (query: string) => void
  onClear: () => void
  onSelectDate: (date: string) => void
}

export function ReviewSearch({ results, loading, searched, onSearch, onClear, onSelectDate }: Props) {
  const [query, setQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleChange = (value: string) => {
    setQuery(value)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!value.trim()) {
      onClear()
      return
    }
    debounceRef.current = setTimeout(() => onSearch(value), 350)
  }

  const handleClear = () => {
    setQuery('')
    onClear()
  }

  return (
    <div className="space-y-3">
      {/* Search input */}
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="Search past reviews…"
          className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-9 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim/40 outline-none focus:border-accent-cyan transition-colors"
        />
        {query && (
          <button
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-dim hover:text-text-secondary transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center gap-2 text-text-dim font-mono text-xs py-2">
          <Loader2 size={12} className="animate-spin" />
          Searching…
        </div>
      )}

      {searched && !loading && results.length === 0 && (
        <p className="font-mono text-xs text-text-dim py-2">No results found.</p>
      )}

      {results.length > 0 && (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {results.map((r, i) => (
            <button
              key={`${r.id}-${r.entryNumber}-${i}`}
              onClick={() => onSelectDate(r.date)}
              className="w-full text-left rounded-lg border border-border bg-surface-2 px-3 py-2.5 hover:border-accent-cyan/40 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-[10px] text-text-dim uppercase">
                  {formatSearchDate(r.date)}
                </span>
                <span className="font-mono text-[10px] text-text-dim">
                  Entry {r.entryNumber}
                </span>
              </div>
              <p className="font-sans text-sm text-text-secondary group-hover:text-text-primary transition-colors line-clamp-2">
                {highlightMatch(r.matchedEntry, query)}
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

function formatSearchDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' })
}

function highlightMatch(text: string, _query: string): string {
  return text
}
