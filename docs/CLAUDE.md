# CLAUDE.md — Protocol App

## Project Overview
**Protocol** is a personal discipline enforcement web app for a solo user (Sadique). It combines a visual weekly schedule, focus mode with site/app blocking awareness, habit tracking with streaks, and push notifications — all built on .NET 8 with a React frontend.

This is NOT a generic productivity app. It's a military-grade personal protocol enforcer with a dark cyberpunk aesthetic (dark backgrounds, neon accents, monospace typography). Think terminal meets discipline tracker.

## Tech Stack
- **Backend:** .NET 8 Web API (C#), Entity Framework Core, SQLite (single user, no need for Postgres)
- **Frontend:** React 18 + TypeScript, Vite, TailwindCSS
- **Notifications:** Web Push API (VAPID keys), browser Notification API
- **Hosting:** Single Docker container, deployable to any VPS or local Mac Mini
- **Auth:** None needed — single user app. Optional PIN lock if desired later.

## Architecture

```
protocol-app/
├── CLAUDE.md
├── docker-compose.yml
├── backend/
│   ├── Protocol.Api/              # .NET 8 Web API
│   │   ├── Program.cs
│   │   ├── Protocol.Api.csproj
│   │   ├── appsettings.json
│   │   ├── Controllers/
│   │   │   ├── ScheduleController.cs
│   │   │   ├── FocusController.cs
│   │   │   ├── HabitController.cs
│   │   │   ├── NotificationController.cs
│   │   │   └── DashboardController.cs
│   │   ├── Models/
│   │   │   ├── TimeBlock.cs
│   │   │   ├── WeekSchedule.cs
│   │   │   ├── FocusSession.cs
│   │   │   ├── HabitDefinition.cs
│   │   │   ├── HabitLog.cs
│   │   │   ├── DailyReview.cs
│   │   │   └── BlockedSite.cs
│   │   ├── Services/
│   │   │   ├── ScheduleService.cs
│   │   │   ├── FocusService.cs
│   │   │   ├── HabitService.cs
│   │   │   ├── NotificationService.cs
│   │   │   └── StreakCalculator.cs
│   │   ├── Data/
│   │   │   ├── ProtocolDbContext.cs
│   │   │   └── Migrations/
│   │   └── Middleware/
│   │       └── RequestTimingMiddleware.cs
│   └── Protocol.Api.Tests/
│       └── ... unit tests
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.json
│   │   ├── sw.js                  # Service worker for push notifications
│   │   └── icons/
│   ├── src/
│   │   ├── main.tsx
│   │   ├── App.tsx
│   │   ├── api/
│   │   │   └── client.ts          # Axios/fetch wrapper
│   │   ├── components/
│   │   │   ├── layout/
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   ├── TopBar.tsx
│   │   │   │   └── AppShell.tsx
│   │   │   ├── schedule/
│   │   │   │   ├── WeekView.tsx
│   │   │   │   ├── DayColumn.tsx
│   │   │   │   ├── TimeBlock.tsx
│   │   │   │   ├── CurrentTimeIndicator.tsx
│   │   │   │   └── NowCard.tsx    # "Right now you should be doing X"
│   │   │   ├── focus/
│   │   │   │   ├── FocusMode.tsx
│   │   │   │   ├── FocusTimer.tsx
│   │   │   │   ├── BlockedOverlay.tsx
│   │   │   │   └── FocusHistory.tsx
│   │   │   ├── habits/
│   │   │   │   ├── HabitGrid.tsx
│   │   │   │   ├── HabitCard.tsx
│   │   │   │   ├── StreakDisplay.tsx
│   │   │   │   └── DailyChecklist.tsx
│   │   │   ├── review/
│   │   │   │   ├── DailyReview.tsx # End-of-day 3-line memory exercise
│   │   │   │   └── WeeklyReport.tsx
│   │   │   └── shared/
│   │   │       ├── ProgressRing.tsx
│   │   │       └── CountdownTimer.tsx
│   │   ├── pages/
│   │   │   ├── Dashboard.tsx      # Main view: NowCard + today's schedule + habit status
│   │   │   ├── Schedule.tsx       # Full week view
│   │   │   ├── Focus.tsx          # Focus mode launcher
│   │   │   ├── Habits.tsx         # All habits + streaks
│   │   │   ├── Review.tsx         # Daily review + weekly report
│   │   │   └── Settings.tsx       # Edit schedule, blocked sites, notification prefs
│   │   ├── hooks/
│   │   │   ├── useCurrentBlock.ts # Returns what you should be doing RIGHT NOW
│   │   │   ├── useFocusSession.ts
│   │   │   ├── useNotifications.ts
│   │   │   └── useStreaks.ts
│   │   ├── stores/
│   │   │   └── appStore.ts        # Zustand store
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── utils/
│   │       ├── scheduleData.ts    # Default weekly schedule (hardcoded initially)
│   │       ├── timeUtils.ts
│   │       └── theme.ts
│   └── tests/
│       └── ...
└── docs/
    ├── TICKETS.md                 # Phased build tickets
    └── DESIGN.md                  # UI/UX specs
```

## Core Features (Priority Order)

### P0 — Must Have (Phase 1)
1. **Visual Weekly Schedule** — The exact schedule from the HTML calendar, rendered as an interactive week view with a live "current time" indicator and a prominent "NOW" card showing what you should be doing right now
2. **Habit Tracker** — Daily checkboxes for: Active Recall after reading, No IG outside windows, 1 screen 1 task, Lunch walk, 11:15 PM sleep, 2-min day review. Streak counter per habit with visual fire/chain display
3. **Push Notifications** — Browser push notifications at block transitions ("ML Study starts in 5 min"), habit reminders ("Did you do your lunch walk?"), and sleep warning ("30 min to lights out")
4. **Daily Review** — End-of-day prompt: "Write 3 things you learned today" — stored and searchable

### P1 — Important (Phase 2)
5. **Focus Mode** — Timer-based focus sessions tied to schedule blocks. Shows a fullscreen overlay with the current task, elapsed time, and a blocked sites list. If user navigates to a blocked domain (checked via a simple browser extension or service worker intercept), shows a redirect page saying "NOT NOW. You're in [ML Study] mode."
6. **Weekly Report** — Auto-generated weekly summary: habits completed %, streaks, focus hours, daily review entries
7. **Schedule Editor** — UI to modify time blocks, swap days, adjust the weekly template

### P2 — Nice to Have (Phase 3)
8. **Browser Extension** — Lightweight Chrome extension that checks current schedule block and warns/blocks distracting sites during focus blocks
9. **Mobile PWA** — Service worker + manifest.json for installable PWA on mobile
10. **Gamification** — XP system, level-ups for maintaining streaks, visual "rank" progression (Recruit → Soldier → Commander → General)

## Design System

### Aesthetic: Dark Military Terminal
- **Background:** #0a0a0f (near black)
- **Surface:** #12121a, #1a1a26
- **Border:** #2a2a3a
- **Text:** #e8e8f0 (primary), #7a7a90 (dim)
- **Accent:** Neon purple #a855f7, cyan #06b6d4
- **Category Colors:**
  - Football: #22c55e (green)
  - Gym: #f97316 (orange)
  - ML Study: #06b6d4 (cyan)
  - Content: #ec4899 (pink)
  - Reading: #a78bfa (purple)
  - Work: #facc15 (yellow)
  - Rest: #64748b (slate)
  - Off: #34d399 (emerald)

### Typography
- **Headings/Mono:** JetBrains Mono (700, 800)
- **Body:** DM Sans or equivalent clean sans-serif
- **Code/Data:** JetBrains Mono (400)

### Component Style
- Rounded corners: 6-8px
- Left border accent on cards (3px colored border-left)
- Subtle glow effects on active/current items
- Minimal animations — purposeful, not decorative
- Mobile-first responsive design

## Default Schedule Data (IST — Indian Standard Time)

This is the hardcoded initial schedule. The schedule editor (P1) will let Sadique modify it later.

```json
{
  "weekdays": {
    "monday": {
      "focus": "Football + ML",
      "blocks": [
        { "start": "06:00", "end": "06:30", "type": "routine", "label": "Morning Routine", "note": "No phone. No screens." },
        { "start": "06:30", "end": "07:30", "type": "football", "label": "Football" },
        { "start": "07:30", "end": "08:15", "type": "rest", "label": "Breakfast + IG", "note": "Only IG window" },
        { "start": "08:15", "end": "10:15", "type": "ml", "label": "ML Study", "note": "Active recall. Phone on DND", "focus": true },
        { "start": "10:15", "end": "10:30", "type": "rest", "label": "Break" },
        { "start": "10:30", "end": "12:30", "type": "content", "label": "Content Research", "note": "Topics, scripting, planning", "focus": true },
        { "start": "12:30", "end": "13:30", "type": "rest", "label": "Lunch + Walk", "note": "No screens. Let brain process" },
        { "start": "13:30", "end": "14:30", "type": "reading", "label": "Reading Hour", "note": "Close book → write 3 lines", "focus": true },
        { "start": "14:30", "end": "22:30", "type": "work", "label": "Full-time Work", "note": "Deep focus. 1 screen only", "focus": true },
        { "start": "22:30", "end": "23:15", "type": "rest", "label": "Dinner + Show + Day Review" }
      ]
    },
    "tuesday": {
      "focus": "Gym + Shoot",
      "blocks": [
        { "start": "06:00", "end": "06:30", "type": "routine", "label": "Morning Routine" },
        { "start": "06:30", "end": "07:30", "type": "gym", "label": "Gym" },
        { "start": "07:30", "end": "08:15", "type": "rest", "label": "Breakfast + IG" },
        { "start": "08:15", "end": "11:30", "type": "content", "label": "Video Shoot", "note": "Script → setup → record", "focus": true },
        { "start": "11:30", "end": "11:45", "type": "rest", "label": "Break" },
        { "start": "11:45", "end": "12:30", "type": "ml", "label": "ML Study", "note": "Review yesterday's notes", "focus": true },
        { "start": "12:30", "end": "13:30", "type": "rest", "label": "Lunch + Walk" },
        { "start": "13:30", "end": "14:30", "type": "reading", "label": "Reading Hour", "focus": true },
        { "start": "14:30", "end": "22:30", "type": "work", "label": "Full-time Work", "focus": true },
        { "start": "22:30", "end": "23:15", "type": "rest", "label": "Dinner + Show + Day Review" }
      ]
    },
    "wednesday": {
      "focus": "Football + ML",
      "blocks": [
        { "start": "06:00", "end": "06:30", "type": "routine", "label": "Morning Routine" },
        { "start": "06:30", "end": "07:30", "type": "football", "label": "Football" },
        { "start": "07:30", "end": "08:15", "type": "rest", "label": "Breakfast + IG" },
        { "start": "08:15", "end": "10:15", "type": "ml", "label": "ML Study", "note": "Deep session. New material", "focus": true },
        { "start": "10:15", "end": "10:30", "type": "rest", "label": "Break" },
        { "start": "10:30", "end": "12:30", "type": "content", "label": "Content Research", "note": "Next shoot prep", "focus": true },
        { "start": "12:30", "end": "13:30", "type": "rest", "label": "Lunch + Walk" },
        { "start": "13:30", "end": "14:30", "type": "reading", "label": "Reading Hour", "focus": true },
        { "start": "14:30", "end": "22:30", "type": "work", "label": "Full-time Work", "focus": true },
        { "start": "22:30", "end": "23:15", "type": "rest", "label": "Dinner + Show + Day Review" }
      ]
    },
    "thursday": {
      "focus": "Gym + Shoot",
      "blocks": [
        { "start": "06:00", "end": "06:30", "type": "routine", "label": "Morning Routine" },
        { "start": "06:30", "end": "07:30", "type": "gym", "label": "Gym" },
        { "start": "07:30", "end": "08:15", "type": "rest", "label": "Breakfast + IG" },
        { "start": "08:15", "end": "11:30", "type": "content", "label": "Video Shoot", "note": "Batch record if possible", "focus": true },
        { "start": "11:30", "end": "11:45", "type": "rest", "label": "Break" },
        { "start": "11:45", "end": "12:30", "type": "ml", "label": "ML Study", "note": "Practice problems / code", "focus": true },
        { "start": "12:30", "end": "13:30", "type": "rest", "label": "Lunch + Walk" },
        { "start": "13:30", "end": "14:30", "type": "reading", "label": "Reading Hour", "focus": true },
        { "start": "14:30", "end": "22:30", "type": "work", "label": "Full-time Work", "focus": true },
        { "start": "22:30", "end": "23:15", "type": "rest", "label": "Dinner + Show + Day Review" }
      ]
    },
    "friday": {
      "focus": "Football + Shoot",
      "blocks": [
        { "start": "06:00", "end": "06:30", "type": "routine", "label": "Morning Routine" },
        { "start": "06:30", "end": "07:30", "type": "football", "label": "Football" },
        { "start": "07:30", "end": "08:15", "type": "rest", "label": "Breakfast + IG" },
        { "start": "08:15", "end": "11:00", "type": "content", "label": "Video Shoot", "note": "Week's final shoot", "focus": true },
        { "start": "11:00", "end": "11:15", "type": "rest", "label": "Break" },
        { "start": "11:15", "end": "12:30", "type": "ml", "label": "ML Study", "note": "Week review + next week plan", "focus": true },
        { "start": "12:30", "end": "13:30", "type": "rest", "label": "Lunch + Walk" },
        { "start": "13:30", "end": "14:30", "type": "reading", "label": "Reading Hour", "focus": true },
        { "start": "14:30", "end": "22:30", "type": "work", "label": "Full-time Work", "focus": true },
        { "start": "22:30", "end": "23:15", "type": "rest", "label": "Dinner + Show + Day Review" }
      ]
    },
    "saturday": {
      "focus": "Gym + Pet Projects",
      "blocks": [
        { "start": "07:00", "end": "08:00", "type": "gym", "label": "Gym", "note": "Sleep in 30 min" },
        { "start": "08:00", "end": "09:00", "type": "rest", "label": "Breakfast + IG", "note": "Longer window okay" },
        { "start": "09:00", "end": "12:00", "type": "deep", "label": "Pet Projects", "note": "cgb, LegacyLift, vxlabs", "focus": true },
        { "start": "12:00", "end": "13:00", "type": "rest", "label": "Lunch" },
        { "start": "13:00", "end": "14:00", "type": "reading", "label": "Reading" },
        { "start": "14:00", "end": "23:00", "type": "off", "label": "Free Time", "note": "Beach, friends, shows, rest" }
      ]
    },
    "sunday": {
      "focus": "Full Off Day",
      "blocks": [
        { "start": "08:00", "end": "23:00", "type": "off", "label": "Full Rest Day", "note": "No coding. No content. Brain recovery." }
      ]
    }
  },
  "habits": [
    { "id": "active_recall", "label": "Active Recall after study/reading", "icon": "🧠" },
    { "id": "ig_caged", "label": "No IG outside breakfast + dinner", "icon": "📵" },
    { "id": "one_screen", "label": "1 screen, 1 task (no shows while working)", "icon": "🖥️" },
    { "id": "lunch_walk", "label": "Lunch walk (no screens)", "icon": "🚶" },
    { "id": "sleep_1115", "label": "Lights out by 11:15 PM", "icon": "🌙" },
    { "id": "day_review", "label": "2-min mental day review", "icon": "📝" }
  ],
  "blockedSites": [
    "instagram.com",
    "facebook.com",
    "twitter.com",
    "x.com",
    "reddit.com",
    "youtube.com",
    "netflix.com",
    "primevideo.com",
    "hotstar.com"
  ]
}
```

## API Endpoints

### Schedule
- `GET /api/schedule` — Get full week schedule
- `GET /api/schedule/now` — Get current block + next block
- `PUT /api/schedule/{day}` — Update a day's blocks

### Habits
- `GET /api/habits` — Get all habit definitions
- `GET /api/habits/today` — Get today's habit status
- `GET /api/habits/streaks` — Get streak data for all habits
- `POST /api/habits/{id}/check` — Mark habit as done for today
- `DELETE /api/habits/{id}/check` — Uncheck habit for today

### Focus
- `POST /api/focus/start` — Start a focus session (auto-detects current block)
- `POST /api/focus/stop` — End current focus session
- `GET /api/focus/current` — Get active focus session
- `GET /api/focus/history` — Get focus session history
- `GET /api/focus/blocked-sites` — Get blocked site list for current block

### Review
- `POST /api/review/daily` — Submit daily review (3 things learned)
- `GET /api/review/daily/{date}` — Get review for a specific date
- `GET /api/review/weekly` — Get weekly summary report

### Notifications
- `POST /api/notifications/subscribe` — Register push subscription
- `GET /api/notifications/settings` — Get notification preferences
- `PUT /api/notifications/settings` — Update notification preferences

### Dashboard
- `GET /api/dashboard` — Aggregated: current block, today's habits, active streak count, focus hours today

## Build Commands
```bash
# Backend
cd backend/Protocol.Api
dotnet restore
dotnet build
dotnet run          # Runs on http://localhost:5000

# Frontend
cd frontend
npm install
npm run dev         # Runs on http://localhost:5173

# Docker
docker-compose up --build
```

## Testing
- Backend: xUnit tests in Protocol.Api.Tests
- Frontend: Vitest + React Testing Library
- Run all: `dotnet test && cd frontend && npm test`

## Key Implementation Notes

1. **SQLite is fine** — This is a single-user app. No need for Postgres complexity. DB file lives at `./data/protocol.db`

2. **Schedule is seeded, not dynamic initially** — Phase 1 hardcodes the schedule in `scheduleData.ts` and seeds the DB on first run. The schedule editor comes in Phase 2.

3. **Push notifications need VAPID keys** — Generate once with `dotnet run -- generate-vapid` and store in appsettings.json. Service worker handles the push events.

4. **Focus mode blocking is advisory in Phase 1** — The web app shows an overlay/warning when you should be focused. Real browser-level blocking requires the Chrome extension (Phase 3).

5. **Time zone: IST (UTC+5:30)** — Hardcoded for now. All time comparisons use IST.

6. **The "NOW" card is the killer feature** — Dashboard opens to a large, impossible-to-ignore card showing: what you should be doing, how long until the next block, and your habit completion for today. This is the thing Sadique sees every time he opens the app.

7. **Streak logic** — A streak breaks if a habit is not checked by end of day (11:59 PM IST). Weekends: only applicable habits count (no work habits on Sunday). Streak display shows fire emoji progression: 🔥 (1-6), 🔥🔥 (7-13), 🔥🔥🔥 (14-29), 💎 (30+).

8. **Daily review is prompted** — At 22:30 (dinner time), a push notification asks "What 3 things did you learn today?" The review page has a simple textarea. Entries are saved with date and searchable.

9. **Progress tracking is a first-class feature.** See `docs/ENFORCEMENT.md` for full details on:
   - XP system with 9 ranks (Recruit → Marshal)
   - Streak tracking with milestone badges (7/14/21/30/60/90 days)
   - GitHub-style yearly contribution heatmap
   - Weekly report card with scores, habit compliance, focus hours
   - Device Focus Mode compliance tracking via webhook

10. **Device enforcement is layered.** The Protocol app works alongside native OS features:
    - iOS: Focus Modes + Screen Time + Shortcuts automations
    - Android: Digital Wellbeing Focus Mode + App Timers + Bedtime Mode
    - Desktop: LeechBlock NG (stopgap) → custom Chrome extension (Phase 3)
    - The app includes a `/setup` wizard page that guides through all device configuration

11. **Additional models for progress tracking:**
    ```
    XpTransaction: Id, Source, Amount, Description, CreatedAt
    RankHistory: Id, Rank, AchievedAt, TotalXp
    DeviceCheckin: Id, FocusModeName, Platform, Timestamp, CreatedAt
    ```
