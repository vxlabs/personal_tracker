import { useState, useEffect } from 'react'
import { BookOpen, FileText, BarChart3 } from 'lucide-react'
import { useDailyReview } from '@/hooks/useDailyReview'
import { useReviewCalendar } from '@/hooks/useReviewCalendar'
import { useReviewSearch } from '@/hooks/useReviewSearch'
import { DailyReviewForm } from '@/components/review/DailyReviewForm'
import { CalendarHeatmap } from '@/components/review/CalendarHeatmap'
import { ReviewSearch } from '@/components/review/ReviewSearch'
import { WeeklyReport } from '@/components/review/WeeklyReport'

type Tab = 'daily' | 'weekly'

function todayIst(): string {
  const now = new Date()
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' })
  return formatter.format(now)
}

function currentMonthYear(): { year: number; month: number } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: 'numeric',
  }).formatToParts(now)
  const year = parseInt(parts.find((p) => p.type === 'year')?.value ?? String(now.getFullYear()), 10)
  const month = parseInt(parts.find((p) => p.type === 'month')?.value ?? String(now.getMonth() + 1), 10)
  return { year, month }
}

export function Review() {
  const [tab, setTab] = useState<Tab>('daily')
  const [selectedDate, setSelectedDate] = useState(todayIst)

  const { year: initYear, month: initMonth } = currentMonthYear()
  const [calYear, setCalYear] = useState(initYear)
  const [calMonth, setCalMonth] = useState(initMonth)

  const { review, loading, saving, fetchReview, saveReview } = useDailyReview()
  const { entries, loading: calLoading, fetchCalendar } = useReviewCalendar()
  const { results, loading: searchLoading, searched, search, clear } = useReviewSearch()

  useEffect(() => {
    fetchReview(selectedDate)
  }, [selectedDate, fetchReview])

  useEffect(() => {
    fetchCalendar(calYear, calMonth)
  }, [calYear, calMonth, fetchCalendar])

  const handleSave = async (e1: string, e2: string, e3: string) => {
    await saveReview(selectedDate, e1, e2, e3)
    fetchCalendar(calYear, calMonth)
  }

  const handleSelectDate = (date: string) => {
    setSelectedDate(date)
    const [y, m] = date.split('-').map(Number)
    if (y !== calYear || m !== calMonth) {
      setCalYear(y)
      setCalMonth(m)
    }
  }

  const handleChangeMonth = (y: number, m: number) => {
    setCalYear(y)
    setCalMonth(m)
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center gap-3">
        <BookOpen className="h-5 w-5 text-block-reading" />
        <h1 className="font-sans text-xl font-semibold text-text-primary">Review</h1>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 rounded-lg border border-border bg-surface-1 p-1">
        <TabButton
          active={tab === 'daily'}
          onClick={() => setTab('daily')}
          icon={<FileText size={14} />}
          label="Daily Review"
        />
        <TabButton
          active={tab === 'weekly'}
          onClick={() => setTab('weekly')}
          icon={<BarChart3 size={14} />}
          label="Weekly Report"
        />
      </div>

      {/* Daily Review tab */}
      {tab === 'daily' && (
        <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
          {/* Left: form + search */}
          <div className="space-y-6">
            <DailyReviewForm
              review={review}
              loading={loading}
              saving={saving}
              selectedDate={selectedDate}
              onSave={handleSave}
            />

            <div className="space-y-3">
              <h2 className="font-sans text-sm font-semibold text-text-secondary uppercase tracking-wider">
                Search Reviews
              </h2>
              <ReviewSearch
                results={results}
                loading={searchLoading}
                searched={searched}
                onSearch={search}
                onClear={clear}
                onSelectDate={handleSelectDate}
              />
            </div>
          </div>

          {/* Right: calendar heatmap */}
          <div>
            <CalendarHeatmap
              year={calYear}
              month={calMonth}
              entries={entries}
              loading={calLoading}
              selectedDate={selectedDate}
              onSelectDate={handleSelectDate}
              onChangeMonth={handleChangeMonth}
            />
          </div>
        </div>
      )}

      {/* Weekly Report tab */}
      {tab === 'weekly' && <WeeklyReport />}
    </div>
  )
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-2 rounded-md px-3 py-2 font-sans text-sm font-medium transition-all ${
        active
          ? 'bg-surface-2 text-text-primary'
          : 'text-text-dim hover:text-text-secondary'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
