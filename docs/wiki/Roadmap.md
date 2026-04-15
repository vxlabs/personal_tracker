# Roadmap

Build tickets are executed in order. Each ticket is a self-contained deliverable committed as `TICKET-XXX: Brief description`.

---

## Phase 1 — Foundation (Tickets 1–8)
**Goal:** Working app with schedule view, habit tracking, and notifications.

| Ticket | Description | Status |
|---|---|---|
| TICKET-001 | Project scaffolding (.NET 8 API + React/Vite + Docker) | ✅ Done |
| TICKET-002 | Database & models (EF Core, SQLite, seeder) | ✅ Done |
| TICKET-003 | Schedule API (`/api/schedule`, `/api/schedule/now`) | ✅ Done |
| TICKET-004 | Habits API (check/uncheck, streak calculator) | ✅ Done |
| TICKET-005 | Frontend shell & routing (AppShell, Sidebar, all routes) | ✅ Done |
| TICKET-006 | Dashboard (NowCard, habits section, stats row) | ✅ Done |
| TICKET-007 | Schedule week view (7-day grid, current-time indicator) | ✅ Done |
| TICKET-008 | Push notifications (VAPID, background service, SW) | ✅ Done |

---

## Phase 2 — Enforcement (Tickets 9–13)
**Goal:** Focus mode, site blocking, weekly reports, schedule editing.

| Ticket | Description | Status |
|---|---|---|
| TICKET-009 | Focus mode (fullscreen overlay, timer, session history) | ✅ Done |
| TICKET-010 | Blocked sites advisory (settings UI, focus mode panel) | ✅ Done |
| TICKET-011 | Daily review & search (3-point entry, heatmap, search) | ✅ Done |
| TICKET-012 | Weekly report (habit compliance, focus hours, score) | ✅ Done |
| TICKET-013 | Schedule editor (drag/form editor, validation) | ✅ Done |

---

## Phase 3 — Expansion (Tickets 14–16)
**Goal:** Real browser-level enforcement, full PWA, gamification.

| Ticket | Description | Status |
|---|---|---|
| TICKET-014 | Chrome extension (Manifest V3, focus blocker, blocked page) | ✅ Done |
| TICKET-015 | Full PWA (service worker, offline cache, mobile install) | ⬜ Next |
| TICKET-016 | Gamification (XP system, ranks, level-up notifications) | ⬜ Pending |

---

## Extension Tickets (E01–E07)
**Goal:** Upgrade the extension to TypeScript + React with a Knowledge Clipper.

| Ticket | Description | Status |
|---|---|---|
| TICKET-E01 | Extension scaffolding (Vite, React, MV3, Readability + Turndown bundled) | ⬜ Pending |
| TICKET-E02 | Schedule sync + focus blocker (schedule-sync.ts, blocker.ts, badge, blocked attempt logging) | ⬜ Pending |
| TICKET-E03 | Generic content extractor (Readability + Turndown pipeline, YAML frontmatter) | ⬜ Pending |
| TICKET-E04 | Site-specific extractors (Twitter threads, Reddit posts+comments, YouTube metadata) | ⬜ Pending |
| TICKET-E05 | Clipper popup UI (ClipView, QuickCapture, FocusView, tag suggestions, markdown preview) | ⬜ Pending |
| TICKET-E06 | Context menu + keyboard shortcuts (`Alt+Shift+K` open, `Alt+Shift+S` quick save) | ⬜ Pending |
| TICKET-E07 | Options page + API config (URL config, blocked sites management, auto-compile toggle) | ⬜ Pending |

---

## Execution Rules

1. Build in order — each ticket builds on the previous.
2. Commit after each ticket: `TICKET-XXX: Brief description`.
3. Phase 1 is the MVP. Tickets 1–8 = usable app.
4. IST timezone is critical. Every time-based calculation must use Indian Standard Time.
5. No over-engineering. Single-user app. No auth, no caching layers, SQLite is correct.
6. Test each ticket before moving to the next.
