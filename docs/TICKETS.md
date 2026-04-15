# TICKETS.md — Protocol App Build Plan

## Phase 1: Foundation (Tickets 1–8)
**Goal:** Working app with schedule view, habit tracking, and notifications. Ship and start using.

---

### TICKET-001: Project Scaffolding
**Priority:** P0 | **Estimate:** 30 min

**Tasks:**
- Create .NET 8 Web API project: `dotnet new webapi -n Protocol.Api` in `backend/`
- Add NuGet packages: `Microsoft.EntityFrameworkCore.Sqlite`, `WebPush` (for VAPID push notifications)
- Create React + TypeScript project with Vite in `frontend/`
- Add npm packages: `react-router-dom`, `zustand`, `axios`, `lucide-react`, `date-fns`, `tailwindcss`
- Configure Tailwind with the dark theme color palette from CLAUDE.md design system
- Set up proxy in vite.config.ts to forward `/api` to `localhost:5000`
- Create `docker-compose.yml` with backend + frontend services
- Verify both projects build and run independently

**Done when:** `dotnet run` serves API on :5000, `npm run dev` serves frontend on :5173, API calls proxy correctly.

---

### TICKET-002: Database & Models
**Priority:** P0 | **Estimate:** 30 min

**Tasks:**
- Create `ProtocolDbContext.cs` with DbSets for: `TimeBlock`, `WeekSchedule`, `HabitDefinition`, `HabitLog`, `DailyReview`, `FocusSession`, `BlockedSite`, `PushSubscription`
- Create all model classes per the architecture in CLAUDE.md
- Configure SQLite connection string in appsettings.json pointing to `./data/protocol.db`
- Create initial migration
- Create a `DatabaseSeeder.cs` that seeds the default schedule and habits from CLAUDE.md JSON on first run
- Register DbContext in Program.cs with auto-migration on startup

**Models:**
```
TimeBlock: Id, DayOfWeek, StartTime, EndTime, Type, Label, Note, IsFocusBlock, SortOrder
HabitDefinition: Id, Key, Label, Icon, IsActive, ApplicableDays (bitmask)
HabitLog: Id, HabitDefinitionId, Date, IsCompleted, CompletedAt
DailyReview: Id, Date, Entry1, Entry2, Entry3, CreatedAt
FocusSession: Id, StartedAt, EndedAt, BlockType, BlockLabel, DurationMinutes
BlockedSite: Id, Domain, IsActive
PushSubscription: Id, Endpoint, P256dh, Auth, CreatedAt
```

**Done when:** App starts, creates DB, seeds data, EF migrations work.

---

### TICKET-003: Schedule API
**Priority:** P0 | **Estimate:** 30 min

**Tasks:**
- `ScheduleController.cs` with endpoints:
  - `GET /api/schedule` — Returns full week schedule grouped by day
  - `GET /api/schedule/now` — Returns current active block + next upcoming block based on IST time
  - `GET /api/schedule/{day}` — Returns blocks for a specific day
- `ScheduleService.cs` — Business logic for determining current block from time
- Time calculation must use IST (UTC+5:30). Use `TimeZoneInfo.FindSystemTimeZoneById("India Standard Time")` or offset calculation
- The `/now` endpoint returns: `{ currentBlock, nextBlock, minutesRemaining, percentComplete }`

**Done when:** All three endpoints return correct data. `/now` accurately reflects the current time block in IST.

---

### TICKET-004: Habits API
**Priority:** P0 | **Estimate:** 30 min

**Tasks:**
- `HabitController.cs` with endpoints per CLAUDE.md spec
- `HabitService.cs` with check/uncheck logic
- `StreakCalculator.cs` — calculates current streak and longest streak for each habit
  - Streak = consecutive days habit was completed (excluding non-applicable days)
  - Streak breaks if a habit's applicable day passes without completion
  - Saturday: only applicable habits (no work-related ones)
  - Sunday: only "sleep" habit applies (off day)
- Return format: `{ habitId, label, icon, isCompletedToday, currentStreak, longestStreak }`

**Done when:** Can check/uncheck habits via API, streak calculation works correctly including weekend logic.

---

### TICKET-005: Frontend Shell & Routing
**Priority:** P0 | **Estimate:** 45 min

**Tasks:**
- Set up React Router with routes: `/` (Dashboard), `/schedule`, `/focus`, `/habits`, `/review`, `/settings`
- Build `AppShell.tsx` — full-screen dark layout with sidebar navigation
- Build `Sidebar.tsx` — vertical nav with icons (use lucide-react): Dashboard, Schedule, Focus, Habits, Review, Settings
- Sidebar should show current time (live, updating every second) and today's day name
- Mobile: sidebar collapses to bottom tab bar
- Apply the full design system: colors, fonts (JetBrains Mono + DM Sans via Google Fonts), borders, surface colors
- All CSS via Tailwind utility classes + custom CSS variables for the theme

**Done when:** App shell renders with working navigation between all routes. Dark theme looks clean on desktop and mobile.

---

### TICKET-006: Dashboard Page (The "NOW" Card)
**Priority:** P0 | **Estimate:** 1 hour

**Tasks:**
- Build `Dashboard.tsx` as the main landing page
- **NowCard component (hero):**
  - Large card at top showing: current block label, type icon, color-coded border
  - Progress bar showing how far through the current block you are
  - Countdown: "X min remaining"
  - Note text if applicable (e.g., "Active recall. Phone on DND")
  - Next up: preview of the next block
  - If in a focus block: pulsing border glow effect
- **Today's Habits section:**
  - Row of habit cards with checkbox, icon, and current streak number
  - Tapping checkbox calls the API to toggle completion
  - Visual feedback: completed habits get a green checkmark and slight glow
- **Today's Stats section:**
  - Focus hours completed today
  - Habits completed X/Y
  - Current longest active streak
- `useCurrentBlock.ts` hook — polls `/api/schedule/now` every 30 seconds, returns current/next block data
- Auto-refresh when block transitions happen

**Done when:** Dashboard shows accurate current block, habits are toggleable, stats update in real time. This page alone should be useful enough to start using the app.

---

### TICKET-007: Schedule Week View
**Priority:** P0 | **Estimate:** 1 hour

**Tasks:**
- Build `Schedule.tsx` page with full 7-day week view
- `WeekView.tsx` — grid layout, 7 columns (responsive: scrollable on mobile)
- `DayColumn.tsx` — day header (name + focus theme) + stacked time blocks
- `TimeBlock.tsx` — color-coded card with time range, label, note. Left border color matches type
- `CurrentTimeIndicator.tsx` — horizontal red line showing current time position (like Google Calendar)
- Current day column should have a subtle highlight/glow
- Current active block should have a distinct active state (brighter border, subtle pulse)
- Clicking a block shows a popover with full details

**Done when:** Week view renders all 7 days accurately, current time indicator moves correctly, responsive on mobile.

---

### TICKET-008: Push Notifications
**Priority:** P0 | **Estimate:** 1 hour

**Tasks:**
- Generate VAPID keys and store in appsettings.json
- `NotificationService.cs` — handles sending web push notifications
- `NotificationController.cs` — subscribe endpoint + settings
- `sw.js` service worker — handles push events, shows browser notifications
- `manifest.json` — PWA manifest with app name "Protocol", dark theme colors, icon
- `useNotifications.ts` hook — handles permission request and subscription
- **Notification triggers (backend background service using `IHostedService`):**
  - 5 minutes before each block transition: "ML Study starts in 5 min"
  - Habit reminders: "Did you do your lunch walk?" at 13:30
  - Sleep warning: "30 min to lights out" at 22:45
  - Daily review prompt: "What 3 things did you learn today?" at 22:30
- Settings page: toggle individual notification types on/off
- `frontend/public/manifest.json` for PWA installability

**Done when:** Browser asks for notification permission, notifications fire at correct times, user can toggle them. App is installable as PWA on mobile.

---

## Phase 2: Enforcement (Tickets 9–13)
**Goal:** Focus mode, blocking, weekly reports, and schedule editing.

---

### TICKET-009: Focus Mode
**Priority:** P1 | **Estimate:** 1 hour

**Tasks:**
- `Focus.tsx` page with focus session management
- `FocusMode.tsx` — fullscreen overlay with:
  - Current task name (large, centered)
  - Elapsed timer (counting up)
  - Remaining time in block (counting down)
  - Animated breathing circle or pulse effect
  - "I need a break" button (logs the break, shows 5-min countdown, then returns)
  - "End Session" button
- `FocusTimer.tsx` — reusable timer component
- Auto-start: if user visits Focus page during a focus block, auto-suggests starting a session
- `FocusHistory.tsx` — list of past focus sessions with duration and block type
- API: POST/stop/get endpoints from CLAUDE.md
- Focus session data saved to DB for weekly reports

**Done when:** Can start/stop focus sessions, timer works accurately, sessions persist in DB, history viewable.

---

### TICKET-010: Blocked Sites Advisory
**Priority:** P1 | **Estimate:** 45 min

**Tasks:**
- `BlockedOverlay.tsx` — when focus mode is active, periodically check if focus is maintained
- Blocked sites list management in Settings page (add/remove domains)
- During active focus session, if user opens the Protocol app's Focus page: show blocked sites as a reminder list
- API endpoint `GET /api/focus/blocked-sites` — returns domains that should be avoided in current block
- The app itself can't block sites (that needs the browser extension in Phase 3), but it can:
  - Show a prominent "BLOCKED SITES" panel during focus mode
  - Include blocked site list in focus mode push notifications
  - Track "attempted visits" if the browser extension reports back (Phase 3)

**Done when:** Blocked sites display during focus mode, manageable in settings, stored in DB.

---

### TICKET-011: Daily Review & Search
**Priority:** P1 | **Estimate:** 45 min

**Tasks:**
- `Review.tsx` page with two tabs: Daily Review | Weekly Report
- `DailyReview.tsx`:
  - Three text inputs: "Thing 1", "Thing 2", "Thing 3"
  - Date picker to view past reviews
  - Submit saves to DB via API
  - Calendar heatmap showing which days have reviews (green = done, empty = missed)
  - Search bar to search across all past review entries
- API: POST and GET endpoints per CLAUDE.md
- Push notification at 22:30 deep-links to this page

**Done when:** Can submit daily reviews, view past reviews by date, search across all entries.

---

### TICKET-012: Weekly Report
**Priority:** P1 | **Estimate:** 45 min

**Tasks:**
- `WeeklyReport.tsx`:
  - Auto-generated every Sunday (or viewable for any past week)
  - Sections:
    - **Habit Compliance:** % completion per habit, bar chart
    - **Streak Status:** current streaks, any broken streaks, longest active
    - **Focus Hours:** total hours in focus mode, breakdown by block type (pie/donut chart)
    - **Daily Reviews:** all 7 entries displayed in a timeline
    - **Score:** overall week score out of 100 based on weighted habit completion + focus hours
  - Use simple SVG charts (no heavy chart library needed)
- `GET /api/review/weekly?week=2026-W16` — returns aggregated data

**Done when:** Weekly report generates accurate stats, charts render, viewable for any past week.

---

### TICKET-013: Schedule Editor
**Priority:** P1 | **Estimate:** 1 hour

**Tasks:**
- `Settings.tsx` page — Schedule tab
- Drag-and-drop or form-based block editor per day
- Can modify: start/end times, label, note, type (dropdown), focus flag
- Can add/remove blocks
- Can duplicate a day's schedule to another day
- Changes save to DB via `PUT /api/schedule/{day}`
- Validation: no overlapping blocks, start < end, reasonable time ranges

**Done when:** Can fully edit the weekly schedule through the UI, changes persist and reflect across the app.

---

## Phase 3: Expansion (Tickets 14–16)
**Goal:** Real enforcement via browser extension, full PWA, gamification.

---

### TICKET-014: Chrome Extension
**Priority:** P2 | **Estimate:** 2 hours

**Tasks:**
- Separate `extension/` directory in project
- Manifest V3 Chrome extension
- Connects to Protocol API to get current schedule block and blocked sites
- During focus blocks: intercepts navigation to blocked domains, redirects to a block page
- Block page shows: "NOT NOW. You're in [ML Study] mode. X minutes remaining."
- Extension icon shows current block type color
- Badge shows minutes remaining in current block
- Optional: logs blocked attempts back to API for weekly report

**Done when:** Extension installs in Chrome, actually blocks sites during focus blocks, shows informative redirect page.

---

### TICKET-015: Full PWA
**Priority:** P2 | **Estimate:** 1 hour

**Tasks:**
- Complete service worker with offline caching strategy
- Cache schedule data, habit status, and review entries for offline access
- Background sync: queue habit checks and reviews when offline, sync when back online
- App install prompt on mobile browsers
- Splash screen with Protocol branding
- iOS Safari support (meta tags for standalone mode)
- Test on Android Chrome and iOS Safari

**Done when:** App installs on mobile home screen, works offline for basic viewing, syncs when reconnected.

---

### TICKET-016: Gamification
**Priority:** P2 | **Estimate:** 1 hour

**Tasks:**
- XP system:
  - Completing a habit: +10 XP
  - Focus session completed: +5 XP per 30 min
  - Daily review submitted: +20 XP
  - Perfect day (all habits): +50 XP bonus
  - Streak milestones (7, 14, 30 days): +100, +200, +500 XP
- Rank progression: Recruit (0) → Soldier (500) → Sergeant (1500) → Lieutenant (3000) → Captain (5000) → Commander (8000) → General (12000)
- Visual rank badge in sidebar
- Level-up animation/notification
- Leaderboard against yourself: weekly XP comparison chart

**Done when:** XP accumulates correctly, rank displays and updates, level-up feels rewarding.

---

## Execution Notes for Claude Code

1. **Build in order.** Tickets are sequenced — each builds on the previous. Don't skip ahead.
2. **Test each ticket** before moving to the next. Run the app, verify the feature works.
3. **Phase 1 is the MVP.** Get through tickets 1–8 and the app is usable. Ship it.
4. **Commit after each ticket** with message format: `TICKET-XXX: Brief description`
5. **Don't over-engineer.** This is a single-user app. No auth, no multi-tenancy, no caching layers. Keep it simple.
6. **Frontend first for visual tickets.** For tickets 6 and 7, start with hardcoded data to nail the UI, then wire up the API.
7. **IST timezone** is critical. Every time-based calculation must use Indian Standard Time. Test with edge cases (midnight crossover, end of week).
