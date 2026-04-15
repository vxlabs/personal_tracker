import { Trash2, ChevronUp, ChevronDown, Zap } from 'lucide-react'
import type { BlockInput, BlockType } from '@/types'
import { BLOCK_TYPES } from '@/types'

const TYPE_COLORS: Record<BlockType, string> = {
  football: 'bg-block-football',
  gym: 'bg-block-gym',
  ml: 'bg-block-ml',
  content: 'bg-block-content',
  reading: 'bg-block-reading',
  work: 'bg-block-work',
  rest: 'bg-block-rest',
  off: 'bg-block-off',
  routine: 'bg-block-routine',
  deep: 'bg-block-deep',
}

interface BlockEditorProps {
  block: BlockInput
  index: number
  total: number
  onChange: (index: number, updates: Partial<BlockInput>) => void
  onRemove: (index: number) => void
  onMove: (index: number, direction: 'up' | 'down') => void
}

export function BlockEditor({ block, index, total, onChange, onRemove, onMove }: BlockEditorProps) {
  const typeColor = TYPE_COLORS[block.type as BlockType] ?? 'bg-text-dim'

  return (
    <div className="rounded-md border border-border bg-surface-2 p-3 space-y-3">
      {/* Row 1: Time range + type + focus */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${typeColor}`} />

        <input
          type="time"
          value={block.startTime}
          onChange={(e) => onChange(index, { startTime: e.target.value })}
          className="w-[7rem] rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-accent-purple/60"
        />
        <span className="text-text-dim text-xs">→</span>
        <input
          type="time"
          value={block.endTime}
          onChange={(e) => onChange(index, { endTime: e.target.value })}
          className="w-[7rem] rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-accent-purple/60"
        />

        <select
          value={block.type}
          onChange={(e) => onChange(index, { type: e.target.value })}
          className="rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary focus:outline-none focus:border-accent-purple/60 capitalize"
        >
          {BLOCK_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>

        <button
          onClick={() => onChange(index, { isFocusBlock: !block.isFocusBlock })}
          title={block.isFocusBlock ? 'Focus block (click to toggle)' : 'Not a focus block (click to toggle)'}
          className={`flex items-center gap-1 rounded px-2 py-1.5 text-xs font-mono transition-colors ${
            block.isFocusBlock
              ? 'bg-accent-cyan/15 text-accent-cyan border border-accent-cyan/30'
              : 'bg-surface-1 text-text-dim border border-border hover:text-text-secondary'
          }`}
        >
          <Zap size={12} />
          Focus
        </button>

        <div className="flex items-center gap-0.5 ml-auto">
          <button
            onClick={() => onMove(index, 'up')}
            disabled={index === 0}
            className="p-1 text-text-dim hover:text-text-secondary disabled:opacity-20 transition-colors"
          >
            <ChevronUp size={14} />
          </button>
          <button
            onClick={() => onMove(index, 'down')}
            disabled={index === total - 1}
            className="p-1 text-text-dim hover:text-text-secondary disabled:opacity-20 transition-colors"
          >
            <ChevronDown size={14} />
          </button>
          <button
            onClick={() => onRemove(index)}
            className="p-1 text-text-dim hover:text-red-400 transition-colors ml-1"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Row 2: Label + Note */}
      <div className="flex gap-2">
        <input
          type="text"
          value={block.label}
          onChange={(e) => onChange(index, { label: e.target.value })}
          placeholder="Label"
          className="flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-primary placeholder:text-text-dim/40 focus:outline-none focus:border-accent-purple/60"
        />
        <input
          type="text"
          value={block.note ?? ''}
          onChange={(e) => onChange(index, { note: e.target.value || null })}
          placeholder="Note (optional)"
          className="flex-1 rounded border border-border bg-bg px-2 py-1.5 font-mono text-xs text-text-secondary placeholder:text-text-dim/40 focus:outline-none focus:border-accent-purple/60"
        />
      </div>
    </div>
  )
}
