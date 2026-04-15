import { useState, useMemo } from 'react'
import type { BlockDto } from '@/types'
import { useScheduleWeek } from '@/hooks/useScheduleWeek'
import { useIstMinutesSinceMidnight } from '@/components/schedule/useIstMinutes'
import { ORDERED_DAY_KEYS } from '@/components/schedule/weekConstants'
import { istWeekdayKey } from '@/utils/istTime'
import { DayColumn } from '@/components/schedule/DayColumn'
import { TimeRuler } from '@/components/schedule/TimeRuler'
import { DayTabs } from '@/components/schedule/DayTabs'
import { BlockDetailSheet } from '@/components/schedule/BlockDetailSheet'

export function WeekView() {
  const { week, loading } = useScheduleWeek()
  const nowMinutes = useIstMinutesSinceMidnight()
  const todayKey = istWeekdayKey()
  const [selected, setSelected] = useState<BlockDto | null>(null)
  const [mobileDay, setMobileDay] = useState<string>(todayKey)

  const columns = useMemo(() => {
    if (!week) return []
    return ORDERED_DAY_KEYS.map((key) => ({
      key,
      blocks: week[key] ?? [],
    }))
  }, [week])

  if (loading) {
    return (
      <div
        className="min-h-[min(72vh,840px)] rounded-xl border border-border bg-surface-1 animate-pulse"
        aria-busy
      />
    )
  }

  if (!week) {
    return (
      <div className="rounded-xl border border-border bg-surface-1 p-8 text-center font-sans text-sm text-text-dim">
        Could not load schedule — is the API running?
      </div>
    )
  }

  const mobileDayBlocks = week[mobileDay] ?? []

  return (
    <>
      {/* ── Mobile view (single day + day tabs) ── */}
      <div className="md:hidden flex flex-col rounded-xl border border-border/60 bg-surface-1 overflow-hidden">
        {/* Day tabs strip */}
        <div className="border-b border-border/40 bg-surface-1/90 px-2">
          <DayTabs
            activeKey={mobileDay}
            todayKey={todayKey}
            onSelect={setMobileDay}
          />
        </div>

        {/* Single column + ruler */}
        <div className="flex min-h-[min(70vh,720px)]">
          {/* Time ruler */}
          <div className="flex w-11 shrink-0 flex-col border-r border-border/40">
            <div className="h-14 shrink-0 border-b border-border/40 bg-surface-1" aria-hidden />
            <TimeRuler className="min-h-[calc(min(70vh,720px)-3.5rem)] flex-1" />
          </div>

          {/* Day column full width */}
          <div className="flex flex-1 min-w-0">
            <DayColumn
              dayKey={mobileDay}
              blocks={mobileDayBlocks}
              isToday={mobileDay === todayKey}
              nowMinutes={nowMinutes}
              selectedId={selected?.id ?? null}
              onSelectBlock={setSelected}
              fullWidth
            />
          </div>
        </div>
      </div>

      {/* ── Desktop view (7-column week grid) ── */}
      <div className="hidden md:flex overflow-hidden rounded-xl border border-border/60 bg-surface-1">
        {/* Time ruler */}
        <div className="flex min-h-[min(72vh,840px)] w-11 shrink-0 flex-col border-r border-border/40">
          <div className="h-14 shrink-0 border-b border-border/40 bg-surface-1" aria-hidden />
          <TimeRuler className="min-h-[calc(min(72vh,840px)-3.5rem)] flex-1" />
        </div>

        {/* Day columns */}
        <div className="min-h-0 min-w-0 flex-1 overflow-x-auto">
          <div className="flex min-h-[min(72vh,840px)] min-w-[700px]">
            {columns.map(({ key, blocks }) => (
              <DayColumn
                key={key}
                dayKey={key}
                blocks={blocks}
                isToday={key === todayKey}
                nowMinutes={nowMinutes}
                selectedId={selected?.id ?? null}
                onSelectBlock={setSelected}
              />
            ))}
          </div>
        </div>
      </div>

      {selected ? <BlockDetailSheet block={selected} onClose={() => setSelected(null)} /> : null}
    </>
  )
}
