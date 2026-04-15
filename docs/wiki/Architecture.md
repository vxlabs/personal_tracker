# Architecture

## Overview

Protocol is a single-user personal discipline app. There is no authentication — it is designed to run locally or on a private server. The system has four independent clients that all communicate with one central backend API.

```
┌─────────────────────────────────────────────────────────────┐
│                        Clients                              │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐  │
│  │  React SPA   │  │   Browser    │  │  Electron Widget │  │
│  │  (Vite/TS)   │  │  Extension   │  │  (always-on-top) │  │
│  │  :5173 dev   │  │  Chrome/Fox  │  │                  │  │
│  └──────┬───────┘  └──────┬───────┘  └───────┬──────────┘  │
│         │                 │                  │              │
└─────────┼─────────────────┼──────────────────┼─────────────┘
          │                 │                  │
          └─────────────────┴──────────────────┘
                            │
                    HTTP REST API
                            │
          ┌─────────────────▼─────────────────┐
          │         .NET 8 Web API             │
          │         ASP.NET Core               │
          │         localhost:5000             │
          │                                   │
          │  Controllers → Services → EF Core  │
          └─────────────────┬─────────────────┘
                            │
                    ┌───────▼────────┐
                    │  SQLite DB     │
                    │  protocol.db   │
                    └────────────────┘
```

---

## Backend

**Location:** `backend/Protocol.Api/`

### Layers

| Layer | Responsibility |
|---|---|
| `Controllers/` | HTTP routing, request validation, response shaping |
| `Services/` | Business logic (schedule resolution, streak calc, XP, notifications) |
| `Models/` | EF Core entities |
| `Data/` | `ProtocolDbContext`, migrations, seeder |

### Key services

| Service | Role |
|---|---|
| `ScheduleService` | Resolves current block from IST clock, calculates `minutesRemaining`, `percentComplete` |
| `HabitService` | Check/uncheck logic, delegates streak calc |
| `StreakCalculator` | Consecutive-day streak with weekend-awareness (Saturday: partial habits; Sunday: sleep only) |
| `FocusService` | Start/stop focus sessions, log blocked attempts |
| `NotificationBackgroundService` | `IHostedService` — fires push alerts at configured schedule offsets |
| `WeeklyReportService` | Aggregates habit compliance, focus hours, review entries into a weekly score |
| `DailyReviewService` | CRUD for daily three-point reviews |

### IST timezone

All time comparisons use `TimeZoneInfo` resolved to `"India Standard Time"` (UTC+5:30). The `/api/schedule/now` endpoint resolves the active block relative to IST, not server local time.

---

## Frontend

**Location:** `frontend/src/`

### Routing

| Route | Page |
|---|---|
| `/` | Dashboard (NowCard + habits + stats) |
| `/schedule` | Full 7-day week view with current-time indicator |
| `/focus` | Focus session management + history |
| `/habits` | Habit list with streaks |
| `/review` | Daily review + weekly report tabs |
| `/settings` | Notifications, blocked sites, schedule editor |

### State

- **Zustand stores** — per-domain slices (schedule, habits, focus, XP)
- **React Query / axios** — server state and API calls
- **`useCurrentBlock` hook** — polls `/api/schedule/now` every 30 s

### Design system

| Token | Value |
|---|---|
| Primary font | JetBrains Mono (code), DM Sans (body) |
| Background | `#0a0a0f` |
| Surface | `#111118` |
| Border | `#1e1e2e` |
| Accent focus | `#ef4444` (red) |
| Accent clip | `#06b6d4` (cyan) |
| Text primary | `#e2e8f0` |

---

## Browser Extension

**Locations:** `extension/` (Chrome MV3), `extension-firefox/` (Firefox MV2)

### Data flow

```
background.js
  └─ every 60 s → GET /api/schedule/now
       ├─ update badge (minutes remaining)
       ├─ set icon color (red=focus, cyan=research, grey=rest)
       └─ if focus block active:
            └─ intercept navigation → check domain vs blocked list
                 └─ if blocked → redirect to blocked.html
                      └─ POST /api/focus/blocked-attempt (log the hit)
```

### Files

| File | Purpose |
|---|---|
| `manifest.json` | Permissions, content scripts, background registration |
| `background.js` | Schedule sync, blocking logic, badge updates |
| `content.js` | Injected into pages (future: knowledge clipper) |
| `blocked.html / blocked.js` | "NOT NOW" redirect page with countdown |
| `popup.html / popup.js` | Extension toolbar popup |

---

## Desktop Widget

**Location:** `widget/`

An Electron application that creates a frameless, always-on-top window. It polls the backend every 30 seconds and renders the current block name, countdown timer, and habit completion dots.

| Component | Role |
|---|---|
| `main/main.ts` | Electron main process, window creation, tray icon |
| `main/api-poller.ts` | Polls `/api/schedule/now` and `/api/habit` |
| `renderer/Widget.tsx` | Compact view — block name + timer |
| `renderer/ExpandedView.tsx` | Full view — block + timer + habits + next up |

---

## Data Model

```
TimeBlock          — DayOfWeek, StartTime, EndTime, Type, Label, Note, IsFocusBlock
HabitDefinition    — Key, Label, Icon, IsActive, ApplicableDays (bitmask)
HabitLog           — HabitDefinitionId, Date, IsCompleted, CompletedAt
DailyReview        — Date, Entry1, Entry2, Entry3, CreatedAt
FocusSession       — StartedAt, EndedAt, BlockType, BlockLabel, DurationMinutes
BlockedSite        — Domain, IsActive
BlockedAttempt     — Domain, AttemptedAt, BlockType
PushSubscription   — Endpoint, P256dh, Auth
NotificationPref   — Type, IsEnabled
XpLedgerEntry      — Source, Amount, EarnedAt
```

---

## Deployment

For local use: run backend and frontend separately (or via Docker Compose). For server deployment, the frontend build is served by nginx as a static SPA with `/api` proxied to the backend. See [`Browser-Extensions.md`](Browser-Extensions.md) for updating the extension API base URL when moving to a remote host.
