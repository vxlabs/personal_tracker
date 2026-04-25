# Progress — Protocol App

## Phase 1: Foundation (Tickets 1–8)
Goal: Working app with schedule view, habit tracking, and notifications.

| # | Ticket | Priority | Status | Notes |
|---|--------|----------|--------|-------|
| 1 | Project Scaffolding | P0 | ✅ Done | .NET 8 + React 19 + Vite 8 + Tailwind 4 + Docker |
| 2 | Database & Models | P0 | ✅ Done | 7 entities, SQLite, EF Core migrations, seeder |
| 3 | Schedule API | P0 | ✅ Done | 3 endpoints, IST timezone, current block detection |
| 4 | Habits API | P0 | ✅ Done | Today/streaks/check/uncheck, StreakCalculator with bitmask |
| 5 | Frontend Shell & Routing | P0 | ✅ Done | AppShell, Sidebar (clock + nav), 6 routes, mobile tab bar |
| 6 | Dashboard Page (NOW Card) | P0 | ✅ Done | NowCard, HabitsSection, TodayStats, useCurrentBlock + useScheduleWeek |
| 7 | Schedule Week View | P0 | ✅ Done | WeekView, DayColumn, TimeBlock, IST now line, BlockDetailSheet, TimeRuler |
| 8 | Push Notifications | P0 | ✅ Done | VAPID, service worker, PWA manifest, NotificationBackgroundService |

## Phase 2: Enforcement (Tickets 9–13)
Goal: Focus mode, blocking, weekly reports, schedule editing.

| # | Ticket | Priority | Status |
|---|--------|----------|--------|
| 9 | Focus Mode | P1 | ✅ Done |
| 10 | Blocked Sites Advisory | P1 | ✅ Done |
| 11 | Daily Review & Search | P1 | ✅ Done |
| 12 | Weekly Report | P1 | ✅ Done |
| 13 | Schedule Editor | P1 | ✅ Done |

## Phase 3: Expansion (Tickets 14–16)
Goal: Real enforcement via browser extension, full PWA, gamification.

| # | Ticket | Priority | Status |
|---|--------|----------|--------|
| 14 | Browser Extensions (Chrome/Edge + Firefox) | P2 | ✅ Done |
| 15 | Full PWA | P2 | ✅ Done |
| 16 | Gamification (XP System) | P2 | ✅ Done |

## Phase 4: Knowledge System & Desktop (Post-original scope)
Goal: Personal knowledge wiki, AI-assisted compilation, desktop widget.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 17 | XP / Rank System | ✅ Done | XpLedgerEntry model, XpService, ranks (Recruit→General), habit/focus/review/wiki XP awards |
| 18 | Wiki / Vault System | ✅ Done | Capture URLs/notes → extract → compile with AI → markdown wiki pages, FTS5 search |
| 19 | Wiki AI Agent Profiles | ✅ Done | Configurable CLI-based AI agents (Claude, GPT, etc.) for compile/search |
| 20 | Wiki Graph & Browse | ✅ Done | Knowledge graph visualization, backlinks, page browser, AI search with file synthesis |
| 21 | Desktop Widget (Electron) | ✅ Done | Always-on-top widget, compact/expanded modes, embedded API, tray icon |
| 22 | Desktop Main Window | ✅ Done | Full frontend loaded inside Electron with HashRouter, native messaging for extensions |

## Phase 5: Local Website Activity Intelligence
Goal: Track local website usage, tag productivity, and train an on-device ML.NET model.

| # | Feature | Status | Notes |
|---|---------|--------|-------|
| 23 | Website Activity API + Data Model | 🚧 In Progress | SQLite visit sessions, labels, training runs, summary endpoints |
| 24 | Browser Activity Telemetry | 🚧 In Progress | Chrome/Edge + Firefox active-tab heartbeat, idle cutoff, URL sanitization |
| 25 | ML.NET Productivity Classifier | 🚧 In Progress | On-demand local training, 3-label minimum, manual label override |
| 26 | Activity Dashboard | 🚧 In Progress | Top domains/URLs, label split, unclassified queue, train model action |

## Overall Progress
- **Phase 1:** 8/8 tickets complete (100%)
- **Phase 2:** 5/5 tickets complete (100%)
- **Phase 3:** 3/3 tickets complete (100%)
- **Phase 4:** 6/6 features complete (100%)
- **Phase 5:** 0/4 features complete (in progress)
- **Total:** 22/26 items complete, 4 in progress

## Known Issues
- Extension clipper upgrade (TypeScript/React + Knowledge Clipper) remains optional future work
- Duplicate file entries in git status (forward-slash and backslash paths for some wiki/widget files)
- Website activity tracking is newly added and still needs browser-side manual verification after extension reload/reinstall

## Testing Coverage
- Backend: No unit tests written yet (xUnit project not created)
- Frontend: No tests written yet (Vitest not configured)
- Manual testing performed for each completed ticket
