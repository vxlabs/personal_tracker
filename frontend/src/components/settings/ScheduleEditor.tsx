import { useEffect, useState } from 'react'
import { Calendar, Plus, Copy, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { useScheduleEditor } from '@/hooks/useScheduleEditor'
import { BlockEditor } from '@/components/settings/BlockEditor'
import { DAYS_OF_WEEK } from '@/types'
import type { DayOfWeek } from '@/types'

const DAY_LABELS: Record<DayOfWeek, string> = {
  monday: 'Mon',
  tuesday: 'Tue',
  wednesday: 'Wed',
  thursday: 'Thu',
  friday: 'Fri',
  saturday: 'Sat',
  sunday: 'Sun',
}

export function ScheduleEditor() {
  const {
    blocks,
    selectedDay,
    loading,
    saving,
    error,
    success,
    fetchDay,
    saveDay,
    duplicateDay,
    addBlock,
    removeBlock,
    updateBlock,
    moveBlock,
  } = useScheduleEditor()

  const [showDuplicate, setShowDuplicate] = useState(false)
  const [duplicateTarget, setDuplicateTarget] = useState<DayOfWeek>('tuesday')

  useEffect(() => {
    fetchDay('monday')
  }, [fetchDay])

  const handleDuplicate = async () => {
    await duplicateDay(selectedDay, duplicateTarget)
    setShowDuplicate(false)
  }

  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5 space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Calendar className="h-5 w-5 text-accent-purple" />
        <h2 className="font-sans text-base font-semibold text-text-primary">Schedule Editor</h2>
      </div>

      <p className="text-xs font-mono text-text-dim">
        Edit time blocks for each day. Changes apply immediately across the app.
      </p>

      {/* Day selector tabs */}
      <div className="flex gap-1 overflow-x-auto scrollbar-none">
        {DAYS_OF_WEEK.map((day) => (
          <button
            key={day}
            onClick={() => fetchDay(day)}
            className={`px-3 py-1.5 rounded font-mono text-xs whitespace-nowrap transition-colors ${
              selectedDay === day
                ? 'bg-accent-purple text-white'
                : 'bg-surface-2 text-text-dim hover:text-text-secondary hover:bg-surface-2/80'
            }`}
          >
            {DAY_LABELS[day]}
          </button>
        ))}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-text-dim" />
        </div>
      ) : (
        <>
          {/* Block list */}
          {blocks.length === 0 ? (
            <p className="text-sm text-text-dim text-center py-6 font-mono">
              No blocks for {selectedDay}
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {blocks.map((block, i) => (
                <BlockEditor
                  key={i}
                  block={block}
                  index={i}
                  total={blocks.length}
                  onChange={updateBlock}
                  onRemove={removeBlock}
                  onMove={moveBlock}
                />
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            <button
              onClick={addBlock}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text-secondary hover:text-accent-purple hover:border-accent-purple/40 transition-colors"
            >
              <Plus size={14} />
              Add Block
            </button>

            <button
              onClick={() => setShowDuplicate(!showDuplicate)}
              className="flex items-center gap-1.5 rounded-md border border-border bg-surface-2 px-3 py-2 font-mono text-xs text-text-secondary hover:text-accent-cyan hover:border-accent-cyan/40 transition-colors"
            >
              <Copy size={14} />
              Duplicate Day
            </button>

            <div className="ml-auto">
              <button
                onClick={saveDay}
                disabled={saving}
                className="flex items-center gap-1.5 rounded-md bg-accent-purple px-4 py-2 font-mono text-xs text-white hover:bg-accent-purple/80 transition-colors disabled:opacity-50"
              >
                {saving ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Save size={14} />
                )}
                Save {selectedDay.charAt(0).toUpperCase() + selectedDay.slice(1)}
              </button>
            </div>
          </div>

          {/* Duplicate day panel */}
          {showDuplicate && (
            <div className="flex items-center gap-2 rounded-md border border-accent-cyan/30 bg-accent-cyan/5 p-3">
              <span className="font-mono text-xs text-text-secondary">
                Copy <span className="text-accent-cyan capitalize">{selectedDay}</span> to:
              </span>
              <select
                value={duplicateTarget}
                onChange={(e) => setDuplicateTarget(e.target.value as DayOfWeek)}
                className="rounded border border-border bg-bg px-2 py-1 font-mono text-xs text-text-primary focus:outline-none focus:border-accent-cyan/60 capitalize"
              >
                {DAYS_OF_WEEK.filter((d) => d !== selectedDay).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
              <button
                onClick={handleDuplicate}
                disabled={saving}
                className="rounded bg-accent-cyan/15 border border-accent-cyan/30 px-3 py-1 font-mono text-xs text-accent-cyan hover:bg-accent-cyan/25 transition-colors disabled:opacity-50"
              >
                {saving ? <Loader2 size={12} className="animate-spin" /> : 'Copy'}
              </button>
              <button
                onClick={() => setShowDuplicate(false)}
                className="ml-1 font-mono text-xs text-text-dim hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Status messages */}
          {error && (
            <div className="flex items-center gap-2 text-red-400">
              <AlertCircle size={14} />
              <p className="font-mono text-xs">{error}</p>
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 text-green-400">
              <CheckCircle2 size={14} />
              <p className="font-mono text-xs">Schedule saved successfully</p>
            </div>
          )}
        </>
      )}
    </section>
  )
}
