import { Outlet } from 'react-router-dom'
import { Sidebar, LiveClock } from './Sidebar'
import { OfflineBanner } from '../shared/OfflineBanner'

export function AppShell() {
  return (
    <div className="h-screen overflow-hidden bg-bg">
      <Sidebar />

      {/* Main content area — offset by sidebar width on desktop */}
      <div className="h-screen overflow-hidden md:ml-56 flex flex-col">
        {/* Top bar (desktop only) */}
        <header className="hidden md:flex items-center justify-between px-8 py-3 border-b border-border bg-surface-1/60 backdrop-blur-sm shrink-0">
          <LiveClock />
        </header>

        <OfflineBanner />

        <main className="pb-20 md:pb-0 grow overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 py-6 md:px-8 md:py-7">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
