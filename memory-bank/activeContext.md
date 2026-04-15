# Active Context — Protocol App

## Current Status
**Phase 2 complete** — Enforcement (Tickets 9–13) ✅

**Completed ticket:** TICKET-015 — Full PWA ✅

## Completed Tickets
| Ticket | Description | Status |
|--------|-------------|--------|
| TICKET-001 | Project Scaffolding (.NET 8 + React + Vite + Tailwind + Docker) | ✅ Complete |
| TICKET-002 | Database & Models (EF Core + SQLite + 7 entities + seeder + migration) | ✅ Complete |
| TICKET-003 | Schedule API (3 endpoints: full schedule, current block, day schedule) | ✅ Complete |
| TICKET-004 | Habits API (today status, streaks, check/uncheck with IST timezone) | ✅ Complete |
| TICKET-005 | Frontend Shell & Routing (AppShell, Sidebar with clock, 6 routes, mobile tab bar) | ✅ Complete |
| TICKET-006 | Dashboard — NowCard, habits, stats (`useCurrentBlock`, `useScheduleWeek`, IST focus minutes) | ✅ Complete |
| TICKET-007 | Schedule Week View — `WeekView`, `DayColumn`, `TimeBlock`, `CurrentTimeIndicator`, `BlockDetailSheet`, `TimeRuler`; IST week; `useIstMinutesSinceMidnight` + `TIMING_CONFIG.WEEK_VIEW_CLOCK_TICK_MS` | ✅ Complete |
| TICKET-008 | Push Notifications — VAPID keys, `NotificationService`, `NotificationController`, `NotificationBackgroundService`, `sw.js`, `manifest.json`, `useNotifications` hook, Settings page toggles, PWA installability | ✅ Complete |
| TICKET-009 | Focus Mode — `FocusService`, `FocusController`, `FocusMode` overlay, `FocusTimer`, `FocusHistory`, `useFocusSession`, `useFocusHistory` | ✅ Complete |
| TICKET-010 | Blocked Sites Advisory — `BlockedSitesPanel`, `BlockedSitesSettings`, blocked-sites API | ✅ Complete |
| TICKET-011 | Daily Review & Search — `DailyReviewService`, `ReviewController`, `DailyReviewForm`, `CalendarHeatmap`, `ReviewSearch`, `Review.tsx` tabs | ✅ Complete |
| TICKET-012 | Weekly Report — `WeeklyReportService`, weekly endpoint, `WeeklyReport` component with SVG charts | ✅ Complete |
| TICKET-013 | Schedule Editor — `PUT /api/schedule/{day}`, `POST /api/schedule/duplicate`, `ScheduleEditor`, `BlockEditor`, `useScheduleEditor` | ✅ Complete |
| TICKET-015 | Full PWA — offline caching, background sync, install prompt | ✅ Complete |

## Next Up
| Ticket | Description | Estimate |
|--------|-------------|----------|
| TICKET-014 | Chrome Extension — Manifest V3, site blocking during focus, redirect page | 2 hours |
| TICKET-016 | Gamification — XP system, ranks, level-up animations | 1 hour |

## Recent Changes (TICKET-015)
- `package.json`: added `vite-plugin-pwa` and generic `workbox-*` dependencies
- `vite.config.ts`: configured PWA plugin with `injectManifest` strategy
- `src/sw.ts`: custom service worker utilizing Workbox for precaching and `BackgroundSyncPlugin` for POST/PUT queues
- `index.html`: removed manual `sw.js` registration
- `useInstallPrompt.ts`: React hook to intercept `beforeinstallprompt` event
- `Settings.tsx`: New "Install Protocol App" section visible conditionally when PWA can be installed
- `AppShell.tsx` & `OfflineBanner.tsx`: Top UI banner displaying offline indicator when connection drops

## Decisions Made (continued)
- Schedule update uses replace-all strategy: `PUT /api/schedule/{day}` deletes all existing blocks for the day and inserts new ones — simpler than individual CRUD
- Validation enforced server-side: no overlapping blocks, start < end, valid types, non-empty labels
- SortOrder is auto-assigned from array index (0-based)
- Duplicate day replaces target day entirely (with confirmation in UI)
- Block type colors reused from `index.css` theme tokens
- No drag-and-drop — using up/down chevron buttons for reordering (simpler, more accessible)
