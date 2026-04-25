import { useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Activity as ActivityIcon,
  Brain,
  CalendarDays,
  ChevronDown,
  Clock,
  Globe2,
  Layout,
  Search,
  Tag,
  Target,
  Zap,
} from 'lucide-react'
import { useActivity } from '@/hooks/useActivity'
import { useAppActivity } from '@/hooks/useAppActivity'
import type {
  ActivityBucket,
  ActivitySession,
  AppCategoryBucket,
  AppGroupDto,
  DomainGroup,
  ProductivityLabel,
} from '@/types'

type Period = 'today' | 'week'
type LabelChoice = Exclude<ProductivityLabel, 'Unclassified'>

const LABELS: LabelChoice[] = ['Productive', 'Neutral', 'Distracting']

const APP_CATEGORIES = ['Coding', 'Communication', 'Browsing', 'Entertainment', 'Productivity', 'System', 'Uncategorized']

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

function categoryColor(category: string): string {
  switch (category) {
    case 'Coding':
      return 'border-violet-500/30 bg-violet-500/10 text-violet-300'
    case 'Communication':
      return 'border-blue-500/30 bg-blue-500/10 text-blue-300'
    case 'Browsing':
      return 'border-cyan-500/30 bg-cyan-500/10 text-cyan-300'
    case 'Entertainment':
      return 'border-pink-500/30 bg-pink-500/10 text-pink-300'
    case 'Productivity':
      return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
    case 'System':
      return 'border-orange-500/30 bg-orange-500/10 text-orange-300'
    default:
      return 'border-border bg-surface-2 text-text-dim'
  }
}

function categoryBarColor(category: string): string {
  switch (category) {
    case 'Coding':    return 'bg-violet-400'
    case 'Communication': return 'bg-blue-400'
    case 'Browsing':  return 'bg-cyan-400'
    case 'Entertainment': return 'bg-pink-400'
    case 'Productivity': return 'bg-emerald-400'
    case 'System':    return 'bg-orange-400'
    default:          return 'bg-surface-2'
  }
}

// ─── Main Component ────────────────────────────────────────────────────────

export function Activity() {
  const [tab, setTab] = useState<'apps' | 'websites'>('apps')
  const [period, setPeriod] = useState<Period>('today')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ActivityIcon className="h-5 w-5 text-accent-cyan" />
          <h1 className="font-sans text-xl font-semibold text-text-primary">Activity</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-border bg-surface-1 p-1">
            <PeriodButton active={period === 'today'} onClick={() => setPeriod('today')} label="Today" />
            <PeriodButton active={period === 'week'} onClick={() => setPeriod('week')} label="Week" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-1 p-1 w-fit">
        <TabButton
          active={tab === 'apps'}
          onClick={() => setTab('apps')}
          icon={<Layout size={14} />}
          label="App Usage"
        />
        <TabButton
          active={tab === 'websites'}
          onClick={() => setTab('websites')}
          icon={<Globe2 size={14} />}
          label="Website Detail"
        />
      </div>

      {tab === 'apps'
        ? <AppUsageTab period={period} />
        : <WebsiteDetailTab period={period} />
      }
    </div>
  )
}

// ─── App Usage Tab ─────────────────────────────────────────────────────────

function AppUsageTab({ period }: { period: Period }) {
  const {
    summary,
    labels,
    mlStatus,
    loading,
    saving,
    training,
    error,
    trainResult,
    fetchSummary,
    fetchLabels,
    fetchMlStatus,
    saveLabel,
    train,
  } = useAppActivity()

  useEffect(() => {
    fetchSummary(period)
    fetchLabels()
    fetchMlStatus()
  }, [fetchSummary, fetchLabels, fetchMlStatus, period])

  const total = summary?.totalTrackedSeconds ?? 0
  const codingSeconds = useMemo(
    () => summary?.categories.find(c => c.category === 'Coding')?.totalSeconds ?? 0,
    [summary],
  )
  const browsingSeconds = useMemo(
    () => summary?.categories.find(c => c.category === 'Browsing')?.totalSeconds ?? 0,
    [summary],
  )
  const communicationSeconds = useMemo(
    () => summary?.categories.find(c => c.category === 'Communication')?.totalSeconds ?? 0,
    [summary],
  )

  const handleAppLabel = async (processName: string, label: string) => {
    await saveLabel(processName, label)
    await fetchSummary(period)
  }

  const handleTrain = async () => {
    await train()
    await fetchSummary(period)
    await fetchMlStatus()
  }

  const labelCountsForTrain = mlStatus?.labelCounts ?? {}
  const minRequired = mlStatus?.minExamplesRequired ?? 2
  const validLabelCount = Object.values(labelCountsForTrain).filter(c => c >= minRequired).length
  const canTrain = validLabelCount >= 2

  // Map process names to labels from DB labels list
  const labelMap = useMemo(() => {
    const map: Record<string, string> = {}
    for (const l of labels) map[l.processName] = l.label
    return map
  }, [labels])

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Metric cards */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard icon={<Clock size={18} />} label="Total tracked" value={formatDuration(total)} />
        <MetricCard icon={<Zap size={18} />} label="Coding" value={formatDuration(codingSeconds)} color="text-violet-400" />
        <MetricCard icon={<Globe2 size={18} />} label="Browsing" value={formatDuration(browsingSeconds)} color="text-cyan-400" />
        <MetricCard icon={<ActivityIcon size={18} />} label="Communication" value={formatDuration(communicationSeconds)} color="text-blue-400" />
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Category breakdown */}
          <Section title="Time by Category" icon={<CalendarDays size={16} />}>
            {loading
              ? <Loading />
              : <CategoryBreakdown categories={summary?.categories ?? []} />
            }
          </Section>

          {/* App list */}
          <Section title="Apps" icon={<Layout size={16} />}>
            {loading
              ? <Loading />
              : <AppList
                  apps={summary?.apps ?? []}
                  labelMap={labelMap}
                  saving={saving}
                  onLabel={handleAppLabel}
                />
            }
          </Section>
        </div>

        {/* ML sidebar */}
        <div className="space-y-6">
          <Section title="ML Training" icon={<Brain size={16} />}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                {Object.entries(labelCountsForTrain).length === 0 ? (
                  <p className="col-span-2 text-xs text-text-dim">
                    Label some apps below to enable training.
                  </p>
                ) : (
                  Object.entries(labelCountsForTrain).map(([label, count]) => (
                    <div key={label} className={`rounded-lg border px-3 py-2 ${categoryColor(label)}`}>
                      <p className="text-2xs uppercase tracking-wider opacity-80">{label}</p>
                      <p className="font-mono text-lg font-semibold">{count}</p>
                    </div>
                  ))
                )}
              </div>

              <button
                onClick={handleTrain}
                disabled={training || !canTrain}
                className="w-full rounded-lg bg-accent-purple px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-purple/90 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {training ? 'Training...' : 'Train model'}
              </button>

              <p className="text-xs text-text-dim">
                Needs at least {minRequired} labels in 2+ categories. Manual labels always override the model.
              </p>

              {(trainResult ?? (mlStatus?.lastTrainedAtUtc != null)) && (
                <div className="rounded-lg border border-border bg-surface-2 px-3 py-2 text-xs text-text-dim">
                  <p className="font-semibold text-text-secondary">
                    {trainResult?.message ?? mlStatus?.lastTrainingMessage ?? 'No training run yet'}
                  </p>
                  {mlStatus?.lastTrainedAtUtc && (
                    <p className="mt-1 font-mono">
                      Last trained {new Date(mlStatus.lastTrainedAtUtc).toLocaleString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  )
}

// ─── Category Breakdown ────────────────────────────────────────────────────

function CategoryBreakdown({ categories }: { categories: AppCategoryBucket[] }) {
  if (categories.length === 0) {
    return <p className="py-4 text-center text-sm text-text-dim">No app activity tracked yet in this period</p>
  }

  return (
    <div className="space-y-3">
      {categories.map(cat => (
        <div key={cat.category} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className={`rounded-full border px-2 py-0.5 text-xs ${categoryColor(cat.category)}`}>
              {cat.category}
            </span>
            <span className="font-mono text-text-dim">
              {formatDuration(cat.totalSeconds)} ({cat.percentage}%)
            </span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-2">
            <div
              className={`h-full rounded-full ${categoryBarColor(cat.category)} transition-all`}
              style={{ width: `${cat.percentage}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── App List ──────────────────────────────────────────────────────────────

function AppList({
  apps,
  labelMap,
  saving,
  onLabel,
}: {
  apps: AppGroupDto[]
  labelMap: Record<string, string>
  saving: boolean
  onLabel: (processName: string, label: string) => Promise<void>
}) {
  const [search, setSearch] = useState('')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())

  const filtered = search
    ? apps.filter(a => a.processName.toLowerCase().includes(search.toLowerCase()))
    : apps

  const toggleExpand = (name: string) =>
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })

  if (apps.length === 0) {
    return <p className="py-4 text-center text-sm text-text-dim">No app activity in this period</p>
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-dim" />
        <input
          type="text"
          placeholder="Filter apps…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full rounded-lg border border-border bg-surface-2 py-2 pl-8 pr-3 text-sm text-text-primary placeholder-text-dim focus:border-accent-purple focus:outline-none"
        />
      </div>

      {filtered.length === 0 && (
        <p className="py-3 text-center text-sm text-text-dim">No apps match "{search}"</p>
      )}

      {filtered.map(app => (
        <AppRow
          key={app.processName}
          app={app}
          currentLabel={labelMap[app.processName] ?? app.categoryLabel}
          expanded={expanded.has(app.processName)}
          onToggle={() => toggleExpand(app.processName)}
          saving={saving}
          onLabel={label => onLabel(app.processName, label)}
        />
      ))}
    </div>
  )
}

function AppRow({
  app,
  currentLabel,
  expanded,
  onToggle,
  saving,
  onLabel,
}: {
  app: AppGroupDto
  currentLabel: string
  expanded: boolean
  onToggle: () => void
  saving: boolean
  onLabel: (label: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface-2">
      <div className="flex items-start gap-2 px-3 py-3">
        <button
          onClick={onToggle}
          aria-label={expanded ? 'Collapse' : 'Expand'}
          className="mt-0.5 shrink-0 text-text-dim transition-colors hover:text-text-primary"
        >
          <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${expanded ? '' : '-rotate-90'}`} />
        </button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate text-sm font-semibold text-text-primary">{app.processName}</p>
            <span className={`shrink-0 rounded-full border px-2 py-0.5 text-xs ${categoryColor(currentLabel)}`}>
              {currentLabel}
              {app.labelSource === 'ml' ? ' (ML)' : app.labelSource === 'rule' ? ' (rule)' : ''}
            </span>
          </div>
          <p className="mt-0.5 font-mono text-xs text-text-dim">
            {formatDuration(app.totalSeconds)} · {app.sessionCount} {app.sessionCount === 1 ? 'session' : 'sessions'}
          </p>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-border/60 px-3 pb-3 pt-2">
          <p className="mb-2 text-xs text-text-dim">Set category:</p>
          <div className="flex flex-wrap gap-1.5">
            {APP_CATEGORIES.filter(c => c !== 'Uncategorized').map(cat => (
              <button
                key={cat}
                disabled={saving}
                onClick={() => onLabel(cat)}
                className={`rounded-full border px-2 py-0.5 text-xs font-medium transition-opacity disabled:opacity-45 ${categoryColor(cat)}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Website Detail Tab ────────────────────────────────────────────────────

function WebsiteDetailTab({ period }: { period: Period }) {
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
      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard icon={<Clock size={18} />} label="Tracked time" value={formatDuration(total)} />
        <MetricCard icon={<Target size={18} />} label="Productive" value={formatDuration(productiveSeconds)} color="text-emerald-400" />
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

// ─── Shared Components ─────────────────────────────────────────────────────

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
        active ? 'bg-surface-2 text-text-primary' : 'text-text-dim hover:text-text-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
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

function MetricCard({ icon, label, value, color = 'text-accent-cyan' }: { icon: ReactNode; label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-4">
      <div className={`mb-3 flex items-center gap-2 ${color}`}>{icon}</div>
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
