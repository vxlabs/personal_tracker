import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { XpProvider } from '@/context/XpContext'
import { AppShell } from './components/layout/AppShell'
import { Dashboard } from './pages/Dashboard'
import { Schedule } from './pages/Schedule'
import { Focus } from './pages/Focus'
import { Habits } from './pages/Habits'
import { Review } from './pages/Review'
import { Settings } from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <XpProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<Dashboard />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="focus" element={<Focus />} />
          <Route path="habits" element={<Habits />} />
          <Route path="review" element={<Review />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
      </XpProvider>
    </BrowserRouter>
  )
}

export default App
