import { Trash2, Cpu, ExternalLink, Clock, AlertCircle, CheckCircle2, Loader2, RotateCcw } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { VaultSource } from '@/types/wiki'

interface Props {
  source: VaultSource
  onDelete: () => void
  onCompile: () => void
  compiling?: boolean
}

const STATUS_CONFIG = {
  captured: { icon: Clock, label: 'Captured', color: 'text-text-dim' },
  compiled: { icon: CheckCircle2, label: 'Compiled', color: 'text-green-400' },
  error: { icon: AlertCircle, label: 'Error', color: 'text-red-400' },
}

export function SourceCard({ source, onDelete, onCompile, compiling }: Props) {
  const cfg = STATUS_CONFIG[source.status] ?? STATUS_CONFIG.captured
  const Icon = cfg.icon
  const ActionIcon = source.status === 'error' ? RotateCcw : Cpu
  const tags = source.tagsRaw ? source.tagsRaw.split(',').filter(Boolean) : []

  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3 space-y-2 hover:border-border/80 transition-colors">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-text-primary truncate">{source.title || source.slug}</p>
          {source.url && (
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-text-dim hover:text-accent-purple truncate mt-0.5 w-fit"
            >
              <ExternalLink className="h-3 w-3 shrink-0" />
              <span className="truncate max-w-[200px]">{source.url}</span>
            </a>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={onCompile}
            disabled={compiling || source.status === 'compiled'}
            title={source.status === 'error' ? 'Retry with default wiki agent' : 'Compile with default wiki agent'}
            aria-label={source.status === 'error' ? `Retry ${source.title || source.slug}` : `Compile ${source.title || source.slug}`}
            className={`flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors disabled:opacity-40 ${
              source.status === 'error'
                ? 'text-red-300 hover:text-red-200 hover:bg-red-400/10'
                : 'text-text-dim hover:text-accent-purple hover:bg-accent-purple/10'
            }`}
          >
            {compiling ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <ActionIcon className="h-3.5 w-3.5" />
            )}
            {source.status === 'error' && <span>Retry</span>}
          </button>
          <button
            onClick={onDelete}
            title="Delete source"
            className="flex items-center p-1 rounded-md text-text-dim hover:text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className={`flex items-center gap-1 text-xs ${cfg.color}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </span>
        <span className="text-xs text-text-dim">
          {formatDistanceToNow(new Date(source.capturedAt), { addSuffix: true })}
        </span>
        {source.sourceType && source.sourceType !== 'article' && (
          <span className="text-xs text-text-dim bg-surface-1 border border-border px-1.5 py-0.5 rounded-full capitalize">
            {source.sourceType}
          </span>
        )}
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 5).map(tag => (
            <span key={tag} className="text-[10px] text-accent-purple bg-accent-purple/10 px-1.5 py-0.5 rounded-full">
              {tag}
            </span>
          ))}
        </div>
      )}

      {source.userNote && (
        <p className="text-xs text-text-dim italic line-clamp-2">{source.userNote}</p>
      )}
    </div>
  )
}
