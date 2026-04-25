import { Link } from 'react-router-dom'
import { BrainCircuit, BookOpen, FileText, ArrowRight } from 'lucide-react'
import { useWikiStats } from '@/hooks/useWiki'

export function WikiWidget() {
  const { stats, loading } = useWikiStats()

  return (
    <div className="rounded-xl border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BrainCircuit className="h-4 w-4 text-accent-purple" />
          <span className="font-sans text-sm font-semibold text-text-primary">Knowledge Wiki</span>
        </div>
        <Link
          to="/wiki"
          className="flex items-center gap-1 text-xs text-text-dim hover:text-accent-purple transition-colors"
        >
          Open <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-lg bg-background p-3 animate-pulse">
              <div className="h-6 w-12 bg-surface rounded mb-1" />
              <div className="h-3 w-16 bg-surface rounded" />
            </div>
          ))}
        </div>
      ) : stats ? (
        <div className="grid grid-cols-3 gap-3">
          <StatCell
            icon={<BookOpen className="h-3.5 w-3.5" />}
            value={stats.totalSources}
            label="Captured"
            color="text-accent-blue"
          />
          <StatCell
            icon={<FileText className="h-3.5 w-3.5" />}
            value={stats.totalPages}
            label="Wiki pages"
            color="text-accent-purple"
          />
          <StatCell
            icon={<BrainCircuit className="h-3.5 w-3.5" />}
            value={stats.compiledSources}
            label="Compiled"
            color="text-accent-green"
          />
        </div>
      ) : (
        <p className="text-xs text-text-dim">No wiki data yet. Start capturing sources.</p>
      )}

      {stats && stats.totalPages > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-1 border-t border-border">
          {([
            ['entity', stats.entityPages],
            ['concept', stats.conceptPages],
            ['syntax', stats.syntaxPages],
            ['synthesis', stats.synthesiPages],
          ] as const)
            .filter(([, count]) => count > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([type, count]) => (
              <span
                key={type}
                className="inline-flex items-center gap-1 rounded-full bg-background px-2 py-0.5 text-[10px] font-medium text-text-dim"
              >
                {type} <span className="text-text-primary">{count}</span>
              </span>
            ))}
        </div>
      )}
    </div>
  )
}

function StatCell({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: number
  label: string
  color: string
}) {
  return (
    <div className="rounded-lg bg-background p-3 space-y-1">
      <div className={`flex items-center gap-1 ${color}`}>
        {icon}
        <span className="font-mono text-lg font-bold text-text-primary">{value}</span>
      </div>
      <p className="text-[10px] text-text-dim leading-tight">{label}</p>
    </div>
  )
}
