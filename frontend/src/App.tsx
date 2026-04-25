import { BrowserRouter, HashRouter, Routes, Route } from 'react-router-dom'
import { XpProvider } from '@/context/XpContext'
import { isDesktopRuntime } from '@/runtime/config'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Schedule } from './pages/Schedule'
import { Focus } from './pages/Focus'
import { Habits } from './pages/Habits'
import { Review } from './pages/Review'
import { Activity } from './pages/Activity'
import { Settings } from './pages/Settings'
import { Wiki } from './pages/Wiki'
import { Help } from './pages/Help'

function App() {
  const Router = isDesktopRuntime() ? HashRouter : BrowserRouter

  return (
    <Router>
      <XpProvider>
        <Routes>
          <Route element={<AppShell />}>
            <Route index element={<Dashboard />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="focus" element={<Focus />} />
            <Route path="habits" element={<Habits />} />
            <Route path="review" element={<Review />} />
            <Route path="activity" element={<Activity />} />
            <Route path="wiki/*" element={<Wiki />} />
            <Route path="settings" element={<Settings />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </XpProvider>
    </Router>
  )
}

export default App
