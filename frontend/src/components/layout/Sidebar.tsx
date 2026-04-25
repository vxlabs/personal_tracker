import { useState, useEffect } from 'react'
import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  CalendarDays,
  Crosshair,
  Target,
  BookOpen,
  Settings,
  Award,
  BrainCircuit,
  BarChart3,
} from 'lucide-react'
import { useXp } from '@/context/XpContext'
import { format } from 'date-fns'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/schedule', label: 'Schedule', icon: CalendarDays },
  { to: '/focus', label: 'Focus', icon: Crosshair },
  { to: '/habits', label: 'Habits', icon: Target },
  { to: '/review', label: 'Review', icon: BookOpen },
  { to: '/activity', label: 'Activity', icon: BarChart3 },
  { to: '/wiki', label: 'Wiki', icon: BrainCircuit },
  { to: '/settings', label: 'Settings', icon: Settings },
] as const

export function LiveClock() {
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  return (
    <div className="flex items-baseline gap-3">
      <span className="font-mono text-sm font-semibold tabular-nums text-text-primary">
        {format(now, 'HH:mm:ss')}
      </span>
      <span className="font-sans text-xs text-text-dim">
        {format(now, 'EEEE, d MMM')}
      </span>
    </div>
  )
}

export function Sidebar() {
  const { summary, loading: xpLoading } = useXp()

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-56 h-screen bg-surface-1 border-r border-border fixed left-0 top-0 z-30">
        {/* Branding */}
        <div className="px-5 py-5">
          <span className="font-mono text-xs font-bold tracking-[0.2em] text-text-dim uppercase select-none">
            Protocol
          </span>
          {!xpLoading && summary && (
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-2.5 py-2">
              <Award className="h-4 w-4 shrink-0 text-accent-purple" aria-hidden />
              <div className="min-w-0">
                <p className="font-sans text-xs font-semibold text-text-primary truncate">
                  {summary.rankTitle}
                </p>
                <p className="font-mono text-[10px] text-text-dim tabular-nums">
                  {summary.totalXp.toLocaleString()} XP
                  {summary.nextRankTitle != null && summary.xpToNextRank != null && (
                    <span className="text-text-dim/70">
                      {' '}
                      · {summary.xpToNextRank} to {summary.nextRankTitle}
                    </span>
                  )}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-accent-purple/10 text-accent-purple'
                    : 'text-text-dim hover:text-text-primary hover:bg-surface-2'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-border">
          <p className="font-mono text-[10px] text-text-dim/50">v0.1.0</p>
        </div>
      </aside>

      {/* Mobile bottom tab bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-surface-1 border-t border-border flex items-center justify-around px-1 py-1.5 safe-bottom">
        {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-md text-[10px] font-medium transition-colors ${
                isActive
                  ? 'text-accent-purple'
                  : 'text-text-dim'
              }`
            }
          >
            <Icon className="h-5 w-5" />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  )
}
