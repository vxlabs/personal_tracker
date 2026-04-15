# Architecture Breakdown — Protocol App

## Backend (ASP.NET Core 8)

### Entry Point
- `Program.cs` — Configures DI (DbContext, services, CORS), auto-migrates DB, seeds data, maps controllers

### Controllers
| Controller | Routes | Status |
|-----------|--------|--------|
| `ScheduleController` | `GET /api/schedule`, `GET /api/schedule/now`, `GET /api/schedule/{day}` | ✅ Done |
| `HabitController` | `GET /api/habits/today`, `GET /api/habits/streaks`, `POST /api/habits/{id}/check`, `DELETE /api/habits/{id}/check` | ✅ Done |
| `FocusController` | Focus session CRUD | ❌ Not started |
| `NotificationController` | Push subscription + settings | ❌ Not started |
| `DashboardController` | Aggregated dashboard data | ❌ Not started |

### Services
| Service | Purpose | Status |
|---------|---------|--------|
| `ScheduleService` | Current block calculation (IST), day schedule queries | ✅ Done |
| `HabitService` | Check/uncheck habits, today's status, streak data | ✅ Done |
| `StreakCalculator` | Static class: streak logic with bitmask weekday support | ✅ Done |
| `FocusService` | Focus session management | ❌ Not started |
| `NotificationService` | Web push notifications | ❌ Not started |

### Models (7 entities)
All defined and migrated: `TimeBlock`, `HabitDefinition`, `HabitLog`, `DailyReview`, `FocusSession`, `BlockedSite`, `PushSubscription`

### Data
- `ProtocolDbContext` — 7 DbSets with value converters for TimeSpan/DateOnly
- `DatabaseSeeder` — Seeds weekly schedule (7 days), 6 habits (with bitmask ApplicableDays), 9 blocked sites
- Initial migration applied

## Frontend (React 19 + Vite 8)

### Routing (react-router-dom v7)
```
/ (index)     → Dashboard
/schedule     → Schedule
/focus        → Focus
/habits       → Habits
/review       → Review
/settings     → Settings
```

### Layout
- `AppShell.tsx` — Min-h-screen wrapper with Sidebar + Outlet
- `Sidebar.tsx` — Desktop: fixed 240px sidebar with PROTOCOL branding, live clock (1s interval), day name, nav links with active state. Mobile: bottom tab bar with icons + labels

### Pages (all placeholder stubs ready for feature implementation)
Dashboard, Schedule, Focus, Habits, Review, Settings

### API Layer
- `api/client.ts` — Axios instance with baseURL `/api`

### Types
- `BlockDto` — Schedule block data
- `NowResponse` — Current block + next block + progress
- `HabitStatus` — Habit with completion and streak data

### Design System (Tailwind v4 @theme)
Colors defined as `--color-*` tokens: `bg`, `surface-1`, `surface-2`, `border`, `text-primary`, `text-dim`, `accent-purple`, `accent-cyan`, plus block type colors (football, gym, ml, content, reading, work, rest, off, routine, deep)

### Pending directories (to be created per ticket)
- `components/schedule/` — WeekView, DayColumn, TimeBlock, NowCard
- `components/focus/` — FocusMode, FocusTimer, BlockedOverlay
- `components/habits/` — HabitGrid, HabitCard, StreakDisplay
- `components/review/` — DailyReview, WeeklyReport
- `components/shared/` — ProgressRing, CountdownTimer
- `hooks/` — useCurrentBlock, useFocusSession, useNotifications, useStreaks
- `stores/` — appStore.ts (Zustand)
- `utils/` — scheduleData, timeUtils, theme
