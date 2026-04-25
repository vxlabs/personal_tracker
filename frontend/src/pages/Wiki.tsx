import { useState } from 'react'
import { LayoutDashboard, BookOpen, Search, Network } from 'lucide-react'
import { WikiDashboard } from '@/pages/wiki/WikiDashboard'
import { WikiBrowser } from '@/pages/wiki/WikiBrowser'
import { WikiSearch } from '@/pages/wiki/WikiSearch'
import { WikiGraph } from '@/pages/wiki/WikiGraph'

type Tab = 'dashboard' | 'browser' | 'search' | 'graph'

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'browser', label: 'Browser', icon: BookOpen },
  { id: 'search', label: 'Search', icon: Search },
  { id: 'graph', label: 'Graph', icon: Network },
]

export function Wiki() {
  const [tab, setTab] = useState<Tab>('dashboard')

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tab bar */}
      <div className="flex gap-0.5 px-4 pt-4 pb-0 border-b border-border shrink-0">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors -mb-px ${
              tab === id
                ? 'border-accent-purple text-accent-purple'
                : 'border-transparent text-text-dim hover:text-text-primary'
            }`}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-hidden p-4">
        {tab === 'dashboard' && <WikiDashboard />}
        {tab === 'browser' && <WikiBrowser />}
        {tab === 'search' && <WikiSearch />}
        {tab === 'graph' && <WikiGraph />}
      </div>
    </div>
  )
}
