import { Database, FileText, User, Lightbulb, Puzzle, Cpu } from 'lucide-react'
import type { WikiStats } from '@/types/wiki'

interface Props {
  stats: WikiStats
}

export function WikiStatsPanel({ stats }: Props) {
  const failedLabel = stats.failedSources ? `, ${stats.failedSources} failed` : ''
  const items = [
    { label: 'Sources', value: stats.totalSources, sub: `${stats.compiledSources} compiled${failedLabel}`, icon: Database, color: 'text-accent-purple' },
    { label: 'Wiki Pages', value: stats.totalPages, sub: 'total indexed', icon: FileText, color: 'text-blue-400' },
    { label: 'Entities', value: stats.entityPages, sub: 'people / orgs', icon: User, color: 'text-green-400' },
    { label: 'Concepts', value: stats.conceptPages, sub: 'ideas / topics', icon: Lightbulb, color: 'text-yellow-400' },
    { label: 'Syntax', value: stats.syntaxPages, sub: 'code / formulas', icon: Puzzle, color: 'text-cyan-400' },
    { label: 'Syntheses', value: stats.synthesiPages, sub: 'AI compiled', icon: Cpu, color: 'text-pink-400' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map(({ label, value, sub, icon: Icon, color }) => (
        <div key={label} className="rounded-lg border border-border bg-surface-2 p-3">
          <div className={`flex items-center gap-1.5 mb-1 ${color}`}>
            <Icon className="h-3.5 w-3.5" />
            <span className="text-xs font-medium text-text-dim">{label}</span>
          </div>
          <p className="font-mono text-xl font-bold text-text-primary tabular-nums">{value}</p>
          <p className="text-[10px] text-text-dim mt-0.5">{sub}</p>
        </div>
      ))}
    </div>
  )
}
