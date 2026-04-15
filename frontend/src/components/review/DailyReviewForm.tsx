import { useState, useEffect } from 'react'
import { Check, Loader2 } from 'lucide-react'
import type { DailyReviewDto } from '@/types'

interface Props {
  review: DailyReviewDto | null
  loading: boolean
  saving: boolean
  selectedDate: string
  onSave: (entry1: string, entry2: string, entry3: string) => void
}

export function DailyReviewForm({ review, loading, saving, selectedDate, onSave }: Props) {
  const [entry1, setEntry1] = useState('')
  const [entry2, setEntry2] = useState('')
  const [entry3, setEntry3] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setEntry1(review?.entry1 ?? '')
    setEntry2(review?.entry2 ?? '')
    setEntry3(review?.entry3 ?? '')
    setSaved(false)
  }, [review, selectedDate])

  const handleSubmit = async () => {
    if (!entry1.trim() && !entry2.trim() && !entry3.trim()) return
    onSave(entry1, entry2, entry3)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const hasContent = entry1.trim() || entry2.trim() || entry3.trim()

  if (loading) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-6">
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-surface-2" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface-1 p-6 space-y-5">
      <div>
        <p className="font-sans text-sm text-text-secondary mb-1">
          What 3 things did you learn today?
        </p>
        <p className="font-mono text-xs text-text-dim">{formatDisplayDate(selectedDate)}</p>
      </div>

      <div className="space-y-3">
        {[
          { label: '1', value: entry1, setter: setEntry1 },
          { label: '2', value: entry2, setter: setEntry2 },
          { label: '3', value: entry3, setter: setEntry3 },
        ].map(({ label, value, setter }) => (
          <div key={label} className="flex items-start gap-3">
            <span className="font-mono text-xs text-text-dim mt-2.5 w-4 text-right shrink-0">
              {label}.
            </span>
            <input
              type="text"
              value={value}
              onChange={(e) => setter(e.target.value)}
              placeholder={`Thing ${label}`}
              className="flex-1 rounded-lg border border-border bg-surface-2 px-3 py-2 font-sans text-sm text-text-primary placeholder:text-text-dim/40 outline-none focus:border-accent-cyan transition-colors"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!hasContent || saving}
        className="flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 font-sans text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
        style={{
          background: saved ? 'var(--color-accent-green)' : 'var(--color-accent-cyan)',
          color: 'var(--color-bg)',
        }}
      >
        {saving ? (
          <Loader2 size={14} className="animate-spin" />
        ) : saved ? (
          <Check size={14} />
        ) : null}
        {saving ? 'Saving…' : saved ? 'Saved!' : review ? 'Update Review' : 'Save Review'}
      </button>
    </div>
  )
}

function formatDisplayDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
