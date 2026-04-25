import { useState, useEffect } from 'react'
import { Search, ChevronRight, Link, Tag, Clock, Shield, X, ExternalLink } from 'lucide-react'
import { useWikiSearch, useWikiPage } from '@/hooks/useWiki'
import { WikiMarkdown } from '@/components/wiki/WikiMarkdown'
import type { WikiPageMeta } from '@/types/wiki'
import api from '@/api/client'
import { API_ENDPOINTS } from '@/constants/api'

interface Props {
  initialPages?: WikiPageMeta[]
}

export function WikiBrowser({ initialPages = [] }: Props) {
  const [pages, setPages] = useState<WikiPageMeta[]>(initialPages)
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [filterType, setFilterType] = useState<string>('all')
  const [loadingPages, setLoadingPages] = useState(false)

  const { query, results: searchResults, loading: searchLoading, search } = useWikiSearch()
  const { page, loading: pageLoading } = useWikiPage(selectedPath)

  useEffect(() => {
    setLoadingPages(true)
    api.get<WikiPageMeta[]>(API_ENDPOINTS.WIKI_RECENT, { params: { limit: 100 } })
      .then(({ data }) => setPages(data))
      .finally(() => setLoadingPages(false))
  }, [])

  const PAGE_TYPES = ['all', 'entity', 'concept', 'syntax', 'synthesis']

  const displayList = query.trim()
    ? searchResults.map(r => ({ ...r, summary: r.snippet, content: '', tagsRaw: '', backLinksRaw: '', confidence: '', createdAt: '', updatedAt: '' } as WikiPageMeta))
    : pages.filter(p => filterType === 'all' || p.pageType === filterType)

  const backLinks = page?.backLinksRaw
    ? page.backLinksRaw.split(',').filter(Boolean)
    : []

  const tags = page?.tagsRaw
    ? page.tagsRaw.split(',').filter(Boolean)
    : []

  return (
    <div className="flex h-full overflow-hidden rounded-xl border border-border">
      {/* Panel 1: Index / Search */}
      <div className="w-56 shrink-0 flex flex-col border-r border-border bg-surface-1">
        <div className="p-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-dim" />
            <input
              value={query}
              onChange={e => search(e.target.value)}
              placeholder="Search wiki..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-surface-2 text-xs text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
            />
            {searchLoading && (
              <div className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3 w-3 border-2 border-accent-purple border-t-transparent rounded-full animate-spin" />
            )}
          </div>

          {!query && (
            <div className="flex flex-wrap gap-1 mt-2">
              {PAGE_TYPES.map(type => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium capitalize transition-colors ${
                    filterType === type
                      ? 'bg-accent-purple/20 text-accent-purple'
                      : 'text-text-dim hover:text-text-primary'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingPages && (
            <div className="p-4 text-xs text-text-dim text-center">Loading pages...</div>
          )}
          {displayList.length === 0 && !loadingPages && (
            <div className="p-4 text-xs text-text-dim text-center">
              {query ? 'No results' : 'No pages yet'}
            </div>
          )}
          {displayList.map(p => (
            <button
              key={p.filePath}
              onClick={() => setSelectedPath(p.filePath)}
              className={`w-full text-left px-3 py-2.5 border-b border-border/50 last:border-0 transition-colors ${
                selectedPath === p.filePath
                  ? 'bg-accent-purple/10 border-l-2 border-l-accent-purple'
                  : 'hover:bg-surface-2'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <p className="text-xs font-medium text-text-primary truncate">{p.title}</p>
                <ChevronRight className="h-3 w-3 text-text-dim shrink-0" />
              </div>
              <p className="text-[10px] text-text-dim capitalize mt-0.5">{p.pageType}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Panel 2: Page Content */}
      <div className="flex-1 flex flex-col overflow-hidden bg-surface-1">
        {!selectedPath ? (
          <div className="flex-1 flex items-center justify-center text-text-dim">
            <div className="text-center">
              <Search className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">Select a page to read</p>
            </div>
          </div>
        ) : pageLoading ? (
          <div className="flex-1 flex items-center justify-center text-text-dim text-sm">
            <div className="h-5 w-5 border-2 border-accent-purple border-t-transparent rounded-full animate-spin mr-2" />
            Loading...
          </div>
        ) : page ? (
          <div className="flex-1 overflow-y-auto p-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-base font-bold text-text-primary">{page.title}</h2>
                <p className="text-xs text-text-dim mt-0.5 font-mono">{page.filePath}</p>
              </div>
              <button
                onClick={() => setSelectedPath(null)}
                className="text-text-dim hover:text-text-primary p-1 rounded transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <WikiMarkdown content={page.content} onPageClick={setSelectedPath} />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-text-dim text-sm">
            Page not found
          </div>
        )}
      </div>

      {/* Panel 3: Metadata / Backlinks */}
      <div className="w-52 shrink-0 flex flex-col border-l border-border bg-surface-1 overflow-y-auto">
        {page ? (
          <div className="p-3 space-y-4">
            {/* Meta */}
            <div>
              <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2">Page Info</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Shield className="h-3 w-3 text-text-dim shrink-0" />
                  <span className="text-xs text-text-primary capitalize">{page.confidence} confidence</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 text-text-dim shrink-0" />
                  <span className="text-xs text-text-dim">
                    {new Date(page.updatedAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Summary */}
            {page.summary && (
              <div>
                <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-1">Summary</h3>
                <p className="text-xs text-text-primary leading-relaxed">{page.summary}</p>
              </div>
            )}

            {/* Tags */}
            {tags.length > 0 && (
              <div>
                <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2 flex items-center gap-1">
                  <Tag className="h-3 w-3" /> Tags
                </h3>
                <div className="flex flex-wrap gap-1">
                  {tags.map(tag => (
                    <span key={tag} className="text-[10px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded-full">
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Backlinks */}
            <div>
              <h3 className="text-[10px] font-semibold text-text-dim uppercase tracking-wider mb-2 flex items-center gap-1">
                <Link className="h-3 w-3" /> Backlinks
              </h3>
              {backLinks.length === 0 ? (
                <p className="text-xs text-text-dim">No backlinks</p>
              ) : (
                <div className="space-y-1">
                  {backLinks.map(link => (
                    <button
                      key={link}
                      onClick={() => setSelectedPath(link)}
                      className="flex items-center gap-1 text-xs text-accent-purple hover:underline w-full text-left"
                    >
                      <ExternalLink className="h-3 w-3 shrink-0" />
                      <span className="truncate">{link.split('/').pop()?.replace('.md', '')}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4">
            <p className="text-xs text-text-dim text-center">Select a page to see metadata</p>
          </div>
        )}
      </div>
    </div>
  )
}
