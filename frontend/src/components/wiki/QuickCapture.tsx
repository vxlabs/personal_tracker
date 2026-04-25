import { useState } from 'react'
import { Link2, StickyNote, Loader2, CheckCircle2, X, Zap } from 'lucide-react'
import type { CaptureRequest } from '@/types/wiki'

interface XpDelta {
  xpGainedThisAction: number
  rankUp: boolean
  rankTitle: string
}

interface Props {
  onCapture: (req: CaptureRequest) => Promise<XpDelta | null>
}

export function QuickCapture({ onCapture }: Props) {
  const [mode, setMode] = useState<'url' | 'note'>('url')
  const [input, setInput] = useState('')
  const [note, setNote] = useState('')
  const [tags, setTags] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [xpGained, setXpGained] = useState<XpDelta | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() && mode === 'url') return
    if (!note.trim() && mode === 'note') return

    setStatus('loading')
    setErrorMsg('')
    setXpGained(null)
    try {
      const tagList = tags.split(',').map(t => t.trim()).filter(Boolean)
      let xp: XpDelta | null = null
      if (mode === 'url') {
        xp = await onCapture({ url: input.trim(), userNote: note || undefined, tags: tagList })
      } else {
        xp = await onCapture({ title: input.trim() || 'Quick Note', userNote: note.trim(), tags: tagList })
      }
      setXpGained(xp)
      setStatus('success')
      setInput('')
      setNote('')
      setTags('')
      setTimeout(() => { setStatus('idle'); setXpGained(null) }, 3000)
    } catch {
      setStatus('error')
      setErrorMsg('Capture failed. Check that the backend is running.')
    }
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-sans text-sm font-semibold text-text-primary">Quick Capture</h2>
        <div className="flex gap-1">
          <button
            onClick={() => setMode('url')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'url'
                ? 'bg-accent-purple/10 text-accent-purple'
                : 'text-text-dim hover:text-text-primary hover:bg-surface-2'
            }`}
          >
            <Link2 className="h-3 w-3" />
            URL
          </button>
          <button
            onClick={() => setMode('note')}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              mode === 'note'
                ? 'bg-accent-purple/10 text-accent-purple'
                : 'text-text-dim hover:text-text-primary hover:bg-surface-2'
            }`}
          >
            <StickyNote className="h-3 w-3" />
            Note
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2.5">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={mode === 'url' ? 'https://...' : 'Note title (optional)'}
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
        />
        {mode === 'note' && (
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Your note..."
            rows={3}
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50 resize-none"
          />
        )}
        {mode === 'url' && (
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Optional note about this link..."
            className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
          />
        )}
        <input
          value={tags}
          onChange={e => setTags(e.target.value)}
          placeholder="Tags: ml, research, paper (comma-separated)"
          className="w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-text-primary placeholder:text-text-dim focus:outline-none focus:ring-1 focus:ring-accent-purple/50"
        />
        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent-purple px-4 py-2 text-sm font-medium text-white hover:bg-accent-purple/90 disabled:opacity-60 transition-colors"
        >
          {status === 'loading' && <Loader2 className="h-4 w-4 animate-spin" />}
          {status === 'success' && <CheckCircle2 className="h-4 w-4" />}
          {status === 'error' && <X className="h-4 w-4" />}
          {status === 'idle' && (mode === 'url' ? 'Capture URL' : 'Save Note')}
          {status === 'loading' && 'Capturing...'}
          {status === 'success' && (
            <span className="flex items-center gap-1.5">
              Captured!
              {xpGained && xpGained.xpGainedThisAction > 0 && (
                <span className="inline-flex items-center gap-0.5 rounded-full bg-white/20 px-2 py-0.5 text-xs font-bold">
                  <Zap className="h-3 w-3" />
                  +{xpGained.xpGainedThisAction} XP
                </span>
              )}
            </span>
          )}
          {status === 'error' && 'Failed'}
        </button>
        {status === 'success' && xpGained?.rankUp && (
          <p className="text-center text-xs font-semibold text-accent-purple animate-pulse">
            🎖 Rank up! You are now {xpGained.rankTitle}
          </p>
        )}
        {status === 'error' && (
          <p className="text-xs text-red-400">{errorMsg}</p>
        )}
      </form>
    </div>
  )
}
