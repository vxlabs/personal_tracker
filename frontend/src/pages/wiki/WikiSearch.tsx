import { useState } from 'react'
import { Search, Cpu, FileText, CheckCircle2, Loader2 } from 'lucide-react'
import { useWikiSearch, useWikiAiSearch, useWikiAgentStatus } from '@/hooks/useWiki'

export function WikiSearch() {
  const [tab, setTab] = useState<'fts' | 'ai'>('fts')
  const [aiQuery, setAiQuery] = useState('')
  const [filedPath, setFiledPath] = useState('')

  const { query, results, loading: ftsLoading, search } = useWikiSearch()
  const { result: aiResult, loading: aiLoading, error: aiError, aiSearch, fileSynthesis } = useWikiAiSearch()
  const { status: agentStatus } = useWikiAgentStatus()

  const handleAiSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (aiQuery.trim()) aiSearch(aiQuery.trim())
  }

  const handleFile = async () => {
    if (aiResult && aiQuery) {
      const path = await fileSynthesis(aiQuery, aiResult.answer)
      setFiledPath(path)
    }
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-auto p-1">
      <div>
        <h1 className="font-sans text-base font-bold text-text-primary">Wiki Search</h1>
        <p className="text-xs text-text-dim">Search your knowledge base</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-surface-2 border border-border w-fit">
        <button
          onClick={() => setTab('fts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'fts' ? 'bg-surface-1 text-text-primary shadow-sm' : 'text-text-dim hover:text-text-primary'
          }`}
        >
          <Search className="h-3.5 w-3.5" />
          Keyword Search
        </button>
        <button
          onClick={() => setTab('ai')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
            tab === 'ai' ? 'bg-surface-1 text-text-primary shadow-sm' : 'text-text-dim hover:text-text-primary'
          }`}
        >
          <Cpu className="h-3.5 w-3.5" />
          AI Deep Search
        </button>
      </div>

      {/* FTS Search */}
      {tab === 'fts' && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              value={query}
              onChange={e => search(e.target.value)}
              placeholder="Search wiki pages..."
              className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
              autoFocus
            />
            {ftsLoading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-text-dim" />
            )}
          </div>

          {results.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-text-dim">{results.length} result{results.length !== 1 ? 's' : ''}</p>
              {results.map(r => (
                <div key={r.filePath} className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-3.5 w-3.5 text-accent-purple shrink-0" />
                    <p className="text-sm font-medium text-text-primary">{r.title}</p>
                    <span className="ml-auto text-[10px] text-text-dim bg-surface-1 border border-border px-1.5 py-0.5 rounded-full capitalize">
                      {r.pageType}
                    </span>
                  </div>
                  <p className="text-xs text-text-dim font-mono mb-2">{r.filePath}</p>
                  {r.snippet && (
                    <p
                      className="text-xs text-text-primary leading-relaxed"
                      // eslint-disable-next-line react/no-danger
                      dangerouslySetInnerHTML={{ __html: r.snippet }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          {query && !ftsLoading && results.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-text-dim">No pages found for "{query}"</p>
              <button
                onClick={() => setTab('ai')}
                className="mt-2 text-xs text-accent-purple hover:underline"
              >
                Try AI deep search instead →
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Search */}
      {tab === 'ai' && (
        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-2/50 p-3">
            <p className="text-xs text-text-dim">
              AI search reads your wiki pages and synthesizes an answer using your default CLI agent
              {agentStatus?.profile ? ` (${agentStatus.profile.name}).` : '.'}
            </p>
          </div>

          <form onSubmit={handleAiSearch} className="flex gap-2">
            <input
              value={aiQuery}
              onChange={e => setAiQuery(e.target.value)}
              placeholder="Ask a question about your knowledge base..."
              className="flex-1 px-4 py-2.5 rounded-lg border border-border bg-surface-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
            />
            <button
              type="submit"
              disabled={aiLoading || !aiQuery.trim()}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-purple text-white text-sm font-medium hover:bg-accent-purple/90 disabled:opacity-50 transition-colors"
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Cpu className="h-4 w-4" />}
              {aiLoading ? 'Thinking...' : 'Ask'}
            </button>
          </form>

          {aiError && (
            <div className="rounded-lg border border-red-400/30 bg-red-400/10 p-3">
              <p className="text-xs text-red-400">{aiError}</p>
            </div>
          )}

          {aiResult && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-surface-2 p-4">
                <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Answer</h3>
                <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{aiResult.answer}</p>
              </div>

              {aiResult.citations.length > 0 && (
                <div className="rounded-xl border border-border bg-surface-2 p-4">
                  <h3 className="text-xs font-semibold text-text-dim uppercase tracking-wider mb-2">Citations</h3>
                  <div className="space-y-2">
                    {aiResult.citations.map((c, i) => (
                      <div key={i} className="flex items-start gap-2">
                        <FileText className="h-3.5 w-3.5 text-accent-purple shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-medium text-text-primary">{c.title}</p>
                          <p className="text-[10px] text-text-dim font-mono">{c.path}</p>
                          {c.relevance && <p className="text-[10px] text-text-dim mt-0.5">{c.relevance}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {aiResult.canFile && !filedPath && (
                <button
                  onClick={handleFile}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg border border-accent-purple/30 bg-accent-purple/10 text-accent-purple text-sm font-medium hover:bg-accent-purple/20 transition-colors"
                >
                  <FileText className="h-4 w-4" />
                  File synthesis to wiki
                </button>
              )}

              {filedPath && (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-green-400/30 bg-green-400/10">
                  <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                  <span className="text-xs text-green-400">Filed to: {filedPath}</span>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
