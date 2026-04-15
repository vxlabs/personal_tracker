import { useEffect, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Trophy, Flame, Clock, BookOpen, Target } from 'lucide-react'
import { useWeeklyReport } from '@/hooks/useWeeklyReport'
import type { HabitComplianceDto, FocusBreakdownDto, WeekDailyReviewDto } from '@/types'

function currentIsoWeek(): string {
  const now = new Date()
  const ist = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }))
  const thu = new Date(ist)
  thu.setDate(thu.getDate() - ((thu.getDay() + 6) % 7) + 3)
  const jan4 = new Date(thu.getFullYear(), 0, 4)
  const diff = thu.getTime() - jan4.getTime()
  const weekNum = 1 + Math.round((diff / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
  return `${thu.getFullYear()}-W${String(weekNum).padStart(2, '0')}`
}

function shiftWeek(weekStr: string, offset: number): string {
  const [yearStr, weekPart] = weekStr.split('-W')
  const year = parseInt(yearStr, 10)
  const week = parseInt(weekPart, 10) + offset

  if (week < 1) {
    const prevYear = year - 1
    const dec28 = new Date(prevYear, 11, 28)
    const thu = new Date(dec28)
    thu.setDate(thu.getDate() - ((thu.getDay() + 6) % 7) + 3)
    const jan4 = new Date(prevYear, 0, 4)
    const maxWeek = 1 + Math.round(((thu.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)
    return `${prevYear}-W${String(maxWeek).padStart(2, '0')}`
  }

  const dec28 = new Date(year, 11, 28)
  const thu = new Date(dec28)
  thu.setDate(thu.getDate() - ((thu.getDay() + 6) % 7) + 3)
  const jan4 = new Date(year, 0, 4)
  const maxWeek = 1 + Math.round(((thu.getTime() - jan4.getTime()) / 86400000 - 3 + ((jan4.getDay() + 6) % 7)) / 7)

  if (week > maxWeek) {
    return `${year + 1}-W01`
  }
  return `${year}-W${String(week).padStart(2, '0')}`
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  const fmt = new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' })
  return `${fmt.format(s)} – ${fmt.format(e)}`
}

export function WeeklyReport() {
  const [week, setWeek] = useState(currentIsoWeek)
  const { report, loading, error, fetchReport } = useWeeklyReport()
  const isCurrentWeek = week === currentIsoWeek()

  useEffect(() => {
    fetchReport(week)
  }, [week, fetchReport])

  return (
    <div className="space-y-6">
      {/* Week navigator */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-4 py-3">
        <button
          onClick={() => setWeek(prev => shiftWeek(prev, -1))}
          className="rounded-md p-1.5 text-text-dim hover:bg-surface-2 hover:text-text-primary transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="font-mono text-sm font-semibold text-text-primary">{week}</p>
          {report && (
            <p className="text-xs text-text-dim">{formatDateRange(report.startDate, report.endDate)}</p>
          )}
        </div>
        <button
          onClick={() => setWeek(prev => shiftWeek(prev, 1))}
          disabled={isCurrentWeek}
          className="rounded-md p-1.5 text-text-dim hover:bg-surface-2 hover:text-text-primary transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-accent-purple border-t-transparent" />
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {report && !loading && (
        <>
          <ScoreCard score={report.score} />
          <div className="grid gap-6 lg:grid-cols-2">
            <HabitComplianceChart habits={report.habitCompliance} />
            <FocusDonutChart focus={report.focusBreakdown} />
          </div>
          <StreakStatusPanel habits={report.habitCompliance} />
          <ReviewTimeline reviews={report.dailyReviews} startDate={report.startDate} />
        </>
      )}
    </div>
  )
}

function ScoreCard({ score }: { score: number }) {
  const circumference = 2 * Math.PI * 54
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#22c55e' : score >= 60 ? '#facc15' : score >= 40 ? '#f97316' : '#ef4444'

  return (
    <div className="flex items-center gap-6 rounded-lg border border-border bg-surface-1 p-6">
      <div className="relative h-[128px] w-[128px] flex-shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r="54" fill="none" stroke="var(--color-border)" strokeWidth="8" />
          <circle
            cx="60" cy="60" r="54"
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-3xl font-bold text-text-primary">{score}</span>
          <span className="text-2xs text-text-dim uppercase tracking-widest">Score</span>
        </div>
      </div>
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-accent-purple" />
          <h2 className="font-sans text-lg font-semibold text-text-primary">Week Score</h2>
        </div>
        <p className="text-sm text-text-dim">
          {score >= 80
            ? 'Outstanding discipline. Keep this momentum.'
            : score >= 60
              ? 'Solid week. Room for improvement on consistency.'
              : score >= 40
                ? 'Average week. Focus on habit completion.'
                : 'Tough week. Reset and recommit tomorrow.'}
        </p>
        <div className="flex gap-4 pt-2">
          <ScoreLegend color="#22c55e" label="80+" desc="Outstanding" />
          <ScoreLegend color="#facc15" label="60–79" desc="Solid" />
          <ScoreLegend color="#f97316" label="40–59" desc="Average" />
        </div>
      </div>
    </div>
  )
}

function ScoreLegend({ color, label, desc }: { color: string; label: string; desc: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="h-2 w-2 rounded-full" style={{ background: color }} />
      <span className="font-mono text-2xs text-text-dim">{label} {desc}</span>
    </div>
  )
}

function HabitComplianceChart({ habits }: { habits: HabitComplianceDto[] }) {
  const maxPct = 100

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Target size={16} className="text-accent-cyan" />
        <h3 className="font-sans text-sm font-semibold text-text-primary uppercase tracking-wider">
          Habit Compliance
        </h3>
      </div>
      <div className="space-y-3">
        {habits.map(h => (
          <div key={h.habitId} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-sm text-text-secondary">
                <span>{h.icon}</span>
                <span className="truncate max-w-[140px]">{h.label}</span>
              </span>
              <span className="font-mono text-xs text-text-dim">
                {h.completedDays}/{h.applicableDays} · {h.compliancePercent}%
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{
                  width: `${Math.min(h.compliancePercent, maxPct)}%`,
                  background: h.compliancePercent >= 80
                    ? '#22c55e'
                    : h.compliancePercent >= 50
                      ? '#facc15'
                      : '#f97316',
                }}
              />
            </div>
          </div>
        ))}
      </div>
      {habits.length === 0 && (
        <p className="py-4 text-center text-sm text-text-dim">No habit data for this week</p>
      )}
    </div>
  )
}

const BLOCK_COLORS: Record<string, string> = {
  football: '#22c55e',
  gym: '#f97316',
  ml: '#06b6d4',
  content: '#ec4899',
  reading: '#a78bfa',
  work: '#facc15',
  rest: '#64748b',
  off: '#34d399',
  routine: '#94a3b8',
  deep: '#818cf8',
  free: '#6a6a80',
}

function FocusDonutChart({ focus }: { focus: FocusBreakdownDto }) {
  const segments = useMemo(() => {
    if (focus.byType.length === 0) return []
    const total = focus.byType.reduce((acc, t) => acc + t.hours, 0)
    if (total === 0) return []

    let cumulativeAngle = 0
    return focus.byType.map(t => {
      const pct = t.hours / total
      const startAngle = cumulativeAngle
      const angle = pct * 360
      cumulativeAngle += angle
      return { ...t, startAngle, angle, pct, color: BLOCK_COLORS[t.blockType] ?? '#6a6a80' }
    })
  }, [focus])

  const r = 50
  const cx = 60
  const cy = 60

  function describeArc(startAngle: number, endAngle: number): string {
    const startRad = ((startAngle - 90) * Math.PI) / 180
    const endRad = ((endAngle - 90) * Math.PI) / 180
    const x1 = cx + r * Math.cos(startRad)
    const y1 = cy + r * Math.sin(startRad)
    const x2 = cx + r * Math.cos(endRad)
    const y2 = cy + r * Math.sin(endRad)
    const largeArc = endAngle - startAngle > 180 ? 1 : 0
    return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`
  }

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Clock size={16} className="text-accent-purple" />
        <h3 className="font-sans text-sm font-semibold text-text-primary uppercase tracking-wider">
          Focus Hours
        </h3>
      </div>

      {focus.totalHours === 0 ? (
        <p className="py-8 text-center text-sm text-text-dim">No focus sessions this week</p>
      ) : (
        <div className="flex items-center gap-6">
          <div className="relative h-[128px] w-[128px] flex-shrink-0">
            <svg viewBox="0 0 120 120" className="h-full w-full">
              {segments.length === 1 ? (
                <circle cx={cx} cy={cy} r={r} fill={segments[0].color} />
              ) : (
                segments.map((s, i) => (
                  <path
                    key={i}
                    d={describeArc(s.startAngle, s.startAngle + s.angle)}
                    fill={s.color}
                    stroke="var(--color-surface-1)"
                    strokeWidth="1"
                  />
                ))
              )}
              <circle cx={cx} cy={cy} r="32" fill="var(--color-surface-1)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="font-mono text-xl font-bold text-text-primary">{focus.totalHours}</span>
              <span className="text-2xs text-text-dim">hrs</span>
            </div>
          </div>
          <div className="space-y-1.5 min-w-0 flex-1">
            {segments.map((s, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div className="h-2.5 w-2.5 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                <span className="capitalize text-text-secondary truncate">{s.blockType}</span>
                <span className="ml-auto font-mono text-xs text-text-dim flex-shrink-0">
                  {s.hours}h ({Math.round(s.pct * 100)}%)
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function StreakStatusPanel({ habits }: { habits: HabitComplianceDto[] }) {
  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center gap-2">
        <Flame size={16} className="text-block-football" />
        <h3 className="font-sans text-sm font-semibold text-text-primary uppercase tracking-wider">
          Streak Status
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {habits.map(h => (
          <div key={h.habitId} className="flex items-center gap-3 rounded-md border border-border bg-surface-2 px-3 py-2.5">
            <span className="text-lg">{h.icon}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm text-text-secondary">{h.label}</p>
              <div className="flex items-center gap-3 text-xs">
                <span className="font-mono text-accent-cyan">{h.currentStreak}d active</span>
                <span className="text-text-dim">best {h.longestStreak}d</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      {habits.length === 0 && (
        <p className="py-4 text-center text-sm text-text-dim">No habit data</p>
      )}
    </div>
  )
}

function ReviewTimeline({ reviews, startDate }: { reviews: (WeekDailyReviewDto | null)[]; startDate: string }) {
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

  return (
    <div className="rounded-lg border border-border bg-surface-1 p-5">
      <div className="mb-4 flex items-center gap-2">
        <BookOpen size={16} className="text-block-reading" />
        <h3 className="font-sans text-sm font-semibold text-text-primary uppercase tracking-wider">
          Daily Reviews
        </h3>
      </div>
      <div className="space-y-3">
        {reviews.map((r, i) => {
          const dateObj = new Date(startDate + 'T00:00:00')
          dateObj.setDate(dateObj.getDate() + i)
          const dateStr = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

          return (
            <div key={i} className="flex gap-3">
              {/* Timeline dot */}
              <div className="flex flex-col items-center pt-1">
                <div className={`h-2.5 w-2.5 rounded-full flex-shrink-0 ${r ? 'bg-block-football' : 'bg-border'}`} />
                {i < 6 && <div className="mt-1 w-px flex-1 bg-border" />}
              </div>
              {/* Content */}
              <div className="min-w-0 flex-1 pb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-semibold text-text-primary">{dayNames[i]}</span>
                  <span className="text-2xs text-text-dim">{dateStr}</span>
                </div>
                {r ? (
                  <div className="mt-1 space-y-0.5">
                    {[r.entry1, r.entry2, r.entry3].filter(Boolean).map((entry, j) => (
                      <p key={j} className="text-sm text-text-secondary">
                        <span className="text-text-dim mr-1">{j + 1}.</span>
                        {entry}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="mt-1 text-sm italic text-text-dim">No review</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
