import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity as ActivityIcon,
  Brain,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe2,
  Search,
  Tag,
  Target,
} from 'lucide-react'
import { useActivity } from '@/hooks/useActivity'
import type { ActivityBucket, ActivitySession, DomainGroup, ProductivityLabel } from '@/types'

type Period = 'today' | 'week'
type LabelChoice = Exclude<ProductivityLabel, 'Unclassified'>

const LABELS: LabelChoice[] = ['Productive', 'Neutral', 'Distracting']

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const rem = minutes % 60
  return rem === 0 ? `${hours}h` : `${hours}h ${rem}m`
}

function labelClass(label: ProductivityLabel): string {
  switch (label) {
    case 'Productive':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'Neutral':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    case 'Distracting':
      return 'border-rose-500/30 bg-rose-500/10 text-rose-300'
    default:
      return 'border-border bg-surface-2 text-text-dim'
  }
}

export function Activity() {
  const [period, setPeriod] = useState<Period>('week')
  const { summary, loading, saving, training, error, trainResult, fetchSummary, saveLabel, train } = useActivity()

  useEffect(() => {
    fetchSummary(period)
  }, [fetchSummary, period])

  const total = summary?.totalSeconds ?? 0
  const labelCounts = summary?.model.labelCounts ?? {}
  const canTrain = LABELS.every(label => (labelCounts[label] ?? 0) >= 3)

  const handleLabel = async (item: { domain: string; url?: string | null }, label: LabelChoice) => {
    await saveLabel({
      label,
      scope: item.url ? 'url' : 'domain',
      domain: item.domain,
      url: item.url,
    })
    await fetchSummary(period)
  }

  const handleTrain = async () => {
    await train()
    await fetchSummary(period)
  }

  const productiveSeconds = useMemo(
    () => summary?.byLabel.find(b => b.productivityLabel === 'Productive' || b.key === 'Productive')?.activeSeconds ?? 0,
    [summary],
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ActivityIcon className="h-5 w-5 text-accent-cyan" />
          <h1 className="font-sans text-xl font-semibold text-text-primary">Activity</h1>
        </div>

        <div className="flex rounded-lg border border-border bg-surface-1 p-1">
          <PeriodButton active={period === 'today'} onClick={() => setPeriod('today')} label="Today" />
          <PeriodButton active={period === 'week'} onClick={() => setPeriod('week')} label="Week" />
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<Clock size={18} />} label="Tracked time" value={formatDuration(total)} />
        <MetricCard icon={<Target size={18} />} label="Productive" value={formatDuration(productiveSeconds)} />
        <MetricCard
          icon={<Brain size={18} />}
          label="Model"
          value={summary?.model.hasModel ? 'Trained' : 'Not trained'}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <Section title="Productivity Split" icon={<CalendarDays size={16} />}>
            {loading ? <Loading /> : <LabelSplit items={summary?.byLabel ?? []} total={total} />}
          </Section>

          <Section title="Activity by Domain" icon={<Globe2 size={16} />}>
            {loading ? (
              <Loading />
            ) : (
              <DomainGroupList
                groups={summary?.domainGroups ?? []}
                total={total}
                saving={saving}
                onLabel={handleLabel}
              />
            )}
          </Section>
        </div>

        <div className="space-y-6">
          <Section title="ML Training" icon={<Brain size={16} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {LABELS.map(label => (
                  <div key={label} className={`rounded-lg border px-3 py-2 ${labelClass(label)}`}>
                    <p className="text-2xs uppercase tracking-wider opacity-80">{label}</p>
                    <p className="font-mono text-lg font-semibold">{labelCounts[label] ?? 0}</p>
                  </div>
                ))}
              </div>

              <button
                onClick={handleTrain}
                disabled={training || !canTrain}
                className="w-full rounded-lg bg-accent-purple px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {training ? 'Training...' : 'Train model'}
              </button>

              <p className="text-xs text-text-dim">
                Needs 3 examples in each label. Manual labels always override model predictions.
              </p>

              {(trainResult ?? summary?.model) && (
                <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-dim">
                  <p className="font-semibold text-text-secondary">
                    {trainResult?.message ?? summary?.model.lastTrainingMessage ?? 'No training run yet'}
                  </p>
                  {summary?.model.lastTrainedAtUtc && (
                    <p className="mt-1 font-mono">
                      Last trained {new Date(summary.model.lastTrainedAtUtc).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>

          <Section title="Needs Labels" icon={<Tag size={16} />}>
            <div className="space-y-3">
              {(summary?.unclassified ?? []).length === 0 ? (
                <p className="py-4 text-center text-sm text-text-dim">No unclassified activity in this period</p>
              ) : (
                summary?.unclassified.map(session => (
                  <UnclassifiedRow
                    key={session.id}
                    session={session}
                    saving={saving}
                    onLabel={handleLabel}
                  />
                ))
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

function PeriodButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-surface-2 text-text-primary' : 'text-text-dim hover:text-text-secondary'
      }`}
    >
      {label}
    </button>
  )
}

function MetricCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className="mb-3 flex items-center gap-2 text-accent-cyan">{icon}</div>
      <p className="text-xs uppercase tracking-wider text-text-dim">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold text-text-primary">{value}</p>
    </div>
  )
}

function Section({ title, icon, children }: { title: string; icon: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center gap-2">
        <span className="text-accent-purple">{icon}</span>
        <h2 className="font-sans text-sm font-semibold uppercase tracking-wider text-text-primary">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function Loading() {
  return (
    <div className="flex items-center justify-center py-10">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
    </div>
  )
}

function LabelSplit({ items, total }: { items: ActivityBucket[]; total: number }) {
  if (items.length === 0) {
    return <p className="py-4 text-center text-sm text-text-dim">No activity yet</p>
  }

  return (
    <div className="space-y-3">
      {items.map(item => {
        const pct = total > 0 ? Math.round((item.activeSeconds / total) * 100) : 0
        return (
          <div key={item.key} className="space-y-1">
            <div className="flex items-center justify-between text-sm">
              <span className={`rounded-full border px-2 py-0.5 text-xs ${labelClass(item.key as ProductivityLabel)}`}>
                {item.key}
              </span>
              <span className="font-mono text-text-dim">{formatDuration(item.activeSeconds)} ({pct}%)</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full rounded-full bg-accent-cyan" style={{ width: `${pct}%` }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DomainGroupList({
  groups,
  total,
  saving,
  onLabel,
}: {
  groups: DomainGroup[]
  total: number
  saving: boolean
  onLabel: (item: { domain: string; url?: string | null }, label: LabelChoice) => Promise<void>
}) {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set())
  const [search, setSearch] = useState('')

  // Auto-expand the top 3 domains when data first loads
  useEffect(() => {
    if (groups.length > 0) {
      setExpandedDomains(prev =>
        prev.size === 0 ? new Set(groups.slice(0, 3).map(g => g.domain)) : prev,
      )
    }
  }, [groups])

  const filtered = search
    ? groups.filter(g => g.domain.toLowerCase().includes(search.toLowerCase()))
    : groups

  const toggle = (domain: string) => {
    setExpandedDomains(prev => {
      const next = new Set(prev)
      if (next.has(domain)) next.delete(domain)
      else next.add(domain)
      return next
    })
  }

  if (groups.length === 0) {
    return <p className="py-4 text-center text-sm text-text-dim">No activity in this period</p>
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          placeholder="Filter domains…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-8 pr-3 text-sm text-text-primary placeholder-text-dim focus:border-accent-purple focus:outline-none"
        />
      </div>

      {filtered.length === 0 && (
        <p className="py-3 text-center text-sm text-text-dim">No domains match "{search}"</p>
      )}

      {filtered.map(group => (
        <DomainGroupRow
          key={group.domain}
          group={group}
          total={total}
          expanded={expandedDomains.has(group.domain)}
          onToggle={() => toggle(group.domain)}
          saving={saving}
          onLabel={onLabel}
        />
      ))}
    </div>
  )
}

function DomainGroupRow({
  group,
  total,
  expanded,
  onToggle,
  saving,
  onLabel,
}: {
  group: DomainGroup
  total: number
  expanded: boolean
  onToggle: () => void
  saving: boolean
  onLabel: (item: { domain: string; url?: string | null }, label: LabelChoice) => Promise<void>
}) {
  const pct = total > 0 ? Math.round((group.totalSeconds / total) * 100) : 0
  const pageCount = group.urls.length

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
      {/* Domain header row */}
      <div className="flex items-start gap-2 px-3 py-3">
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="mt-0.5 shrink-0 text-text-dim transition-colors hover:text-text-primary"
        >
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`}
          />
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">{group.domain}</p>
            <LabelBadge
              label={group.productivityLabel}
              source={group.labelSource}
              confidence={group.predictionConfidence}
            />
          </div>
          <p className="mt-0.5 font-mono text-xs text-text-dim">
            {formatDuration(group.totalSeconds)}
            {total > 0 ? `, ${pct}%` : ''}
            {' · '}
            {pageCount} {pageCount === 1 ? 'page' : 'pages'}
          </p>
          <LabelButtons
            disabled={saving}
            onLabel={label => onLabel({ domain: group.domain }, label)}
          />
        </div>
      </div>

      {/* URL rows (expanded) */}
      {expanded && group.urls.length > 0 && (
        <div className="border-t border-border/60">
          {group.urls.map((urlBucket, i) => (
            <div
              key={urlBucket.key}
              className={`px-3 py-3 pl-9 ${i < group.urls.length - 1 ? 'border-b border-border/40' : ''}`}
            >
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text-primary">
                    {urlBucket.title && urlBucket.title !== urlBucket.key ? urlBucket.title : urlBucket.key}
                  </p>
                  {urlBucket.title && urlBucket.title !== urlBucket.key && (
                    <p className="mt-0.5 truncate font-mono text-xs text-text-dim">{urlBucket.key}</p>
                  )}
                  <p className="mt-0.5 font-mono text-xs text-text-dim">
                    {formatDuration(urlBucket.activeSeconds)}
                  </p>
                </div>
                <LabelBadge
                  label={urlBucket.productivityLabel}
                  source={urlBucket.labelSource}
                  confidence={urlBucket.predictionConfidence}
                />
              </div>
              <LabelButtons
                disabled={saving}
                onLabel={label => onLabel({ domain: group.domain, url: urlBucket.url }, label)}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function UnclassifiedRow({
  session,
  saving,
  onLabel,
}: {
  session: ActivitySession
  saving: boolean
  onLabel: (item: { domain: string; url?: string | null }, label: LabelChoice) => Promise<void>
}) {
  return (
    <div className="rounded-lg border border-border bg-surface-2 px-3 py-3">
      <p className="truncate text-sm font-medium text-text-primary">{session.title || session.url}</p>
      <p className="mt-1 truncate font-mono text-xs text-text-dim">{session.domain} - {formatDuration(session.activeSeconds)}</p>
      <LabelButtons disabled={saving} onLabel={label => onLabel({ domain: session.domain, url: session.url }, label)} />
    </div>
  )
}

function LabelButtons({
  disabled,
  onLabel,
}: {
  disabled: boolean
  onLabel: (label: LabelChoice) => void
}) {
  return (
    <div className="mt-2 grid grid-cols-3 gap-1.5">
      {LABELS.map(label => (
        <button
          key={label}
          disabled={disabled}
          onClick={() => onLabel(label)}
          className={`rounded-md border px-2 py-1 text-xs font-semibold transition-opacity disabled:opacity-45 ${labelClass(label)}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function LabelBadge({
  label,
  source,
  confidence,
}: {
  label: ProductivityLabel
  source: string
  confidence: number | null
}) {
  return (
    <div className={`shrink-0 rounded-full border px-2 py-1 text-xs ${labelClass(label)}`}>
      {label}
      {source === 'ml' && confidence != null ? ` ${Math.round(confidence * 100)}%` : ''}
    </div>
  )
}
