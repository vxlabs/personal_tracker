# Architecture Breakdown — Protocol App

## Backend (ASP.NET Core 8)

### Entry Point
- `Program.cs` — Configures DI (DbContext, services, CORS), auto-migrates DB, seeds data, maps controllers
- Supports Windows Service mode (`UseWindowsService()`)
- Configurable port via `PROTOCOL_PORT` env var
- Configurable data dir via `PROTOCOL_DATA_DIR` env var
- Initializes vault directory and starts file watcher on startup
- Prints `PROTOCOL_API_READY:{port}` to stdout for Electron port discovery

### Controllers
| Controller | Routes | Status |
|-----------|--------|--------|
| `ScheduleController` | `GET /api/schedule`, `GET /api/schedule/now`, `GET /api/schedule/{day}`, `PUT /api/schedule/{day}`, `POST /api/schedule/duplicate` | ✅ Done |
| `HabitController` | `GET /api/habits/today`, `GET /api/habits/streaks`, `POST /api/habits/{id}/check`, `DELETE /api/habits/{id}/check` | ✅ Done |
| `FocusController` | `POST /api/focus/start`, `POST /api/focus/stop`, `GET /api/focus/current`, `GET /api/focus/history` | ✅ Done |
| `NotificationController` | Push subscription + settings + VAPID key | ✅ Done |
| `ReviewController` | `GET/POST /api/review`, calendar, search, weekly report | ✅ Done |
| `BlockedSitesController` | CRUD + toggle for blocked sites | ✅ Done |
| `WikiController` | Capture, sources CRUD, browse (index/page/recent/log/graph/stats), compile (single/batch/lint), search (FTS5/AI/file-synthesis), sync | ✅ Done |
| `WikiAgentController` | Agent profiles CRUD, set-default, test | ✅ Done |
| `XpController` | `GET /api/xp` summary | ✅ Done |
| Health endpoint | `GET /api/health` | ✅ Done |

### Services
| Service | Purpose | Status |
|---------|---------|--------|
| `ScheduleService` | Current block calculation (IST), day schedule queries | ✅ Done |
| `HabitService` | Check/uncheck habits, today's status, streak data | ✅ Done |
| `StreakCalculator` | Static class: streak logic with bitmask weekday support | ✅ Done |
| `FocusService` | Focus session management | ✅ Done |
| `NotificationService` | Web push notifications (VAPID) | ✅ Done |
| `NotificationBackgroundService` | Hosted service for scheduled push notifications | ✅ Done |
| `DailyReviewService` | Daily journal entries | ✅ Done |
| `WeeklyReportService` | Weekly aggregation report | ✅ Done |
| `XpService` | XP ledger, rank calculation, awards for habits/focus/review/wiki | ✅ Done |
| `ContentExtractorService` | Fetches URLs, converts HTML→Markdown, saves to vault | ✅ Done |
| `WikiCompileService` | AI-powered compilation of raw sources into wiki pages, AI search, lint | ✅ Done |
| `WikiSearchService` | SQLite FTS5 full-text search with LIKE fallback | ✅ Done |
| `WikiAgentService` | Manages CLI AI agent profiles, spawns processes, tests connectivity | ✅ Done |
| `VaultInitService` | Creates default vault directory structure and starter files | ✅ Done |
| `VaultFileWatcher` | FileSystemWatcher for vault `.md` files, auto-indexes into WikiPages table | ✅ Done |

### Models (12 entities)
| Entity | Purpose |
|--------|---------|
| `TimeBlock` | Weekly schedule blocks |
| `HabitDefinition` | Habit metadata with bitmask applicable days |
| `HabitLog` | Daily habit completion records |
| `DailyReview` | Journal entries |
| `FocusSession` | Focus mode sessions |
| `BlockedSite` | Sites blocked during focus |
| `PushSubscription` | Web push subscriptions |
| `NotificationPreference` | Notification settings |
| `BlockedAttempt` | Logged attempts to visit blocked sites |
| `XpLedgerEntry` | XP transactions with dedup via SourceKey |
| `VaultSource` | Captured raw source documents (URL/note) |
| `WikiPageIndex` | Indexed wiki page metadata (FTS5-backed) |
| `WikiAgentProfile` | AI agent CLI configurations |

### Data
- `ProtocolDbContext` — 12 DbSets with value converters for TimeSpan/DateOnly
- `DatabaseSeeder` — Seeds weekly schedule, habits, blocked sites
- Migrations: initial + wiki tables + wiki agent profiles
- Unique constraints on: HabitLog (habitId+date), DailyReview (date), HabitDefinition (key), BlockedSite (domain), XpLedgerEntry (sourceKey), VaultSource (slug), WikiPageIndex (filePath)

### NuGet Packages
- `Microsoft.EntityFrameworkCore.Sqlite` — Database
- `WebPush` — VAPID push notifications
- `Microsoft.Extensions.Hosting.WindowsServices` — Windows Service support
- `ReverseMarkdown` — HTML→Markdown conversion for wiki capture
- `YamlDotNet` — YAML frontmatter parsing for wiki pages
- `Swashbuckle.AspNetCore` — Swagger/OpenAPI

## Frontend (React 19 + Vite 8)

### Routing (react-router-dom v7)
```
/ (index)     → Dashboard
/schedule     → Schedule
/focus        → Focus
/habits       → Habits
/review       → Review
/wiki/*       → Wiki (nested routes: dashboard, search, graph, browser)
/settings     → Settings
```

### Layout
- `AppShell.tsx` — Min-h-screen wrapper with Sidebar + Outlet + OfflineBanner
- `Sidebar.tsx` — Desktop: fixed 224px sidebar with PROTOCOL branding, XP rank badge, nav links. Mobile: bottom tab bar with icons

### Pages
| Page | Key Components |
|------|----------------|
| Dashboard | NowCard, HabitsSection, TodayStats, WikiWidget |
| Schedule | WeekView, DayColumn, TimeBlock, ScheduleEditor |
| Focus | FocusMode overlay, FocusTimer, FocusHistory |
| Habits | HabitGrid, HabitCard, StreakDisplay |
| Review | DailyReviewForm, CalendarHeatmap, ReviewSearch, WeeklyReport |
| Wiki | WikiDashboard, WikiSearch, WikiGraph, WikiBrowser, QuickCapture, SourceCard, WikiStatsPanel, WikiMarkdown |
| Settings | NotificationToggles, BlockedSitesSettings, WikiAgentSettings, PWA install |

### Key Hooks
| Hook | Purpose |
|------|---------|
| `useCurrentBlock` | Polls `/api/schedule/now` for NOW card |
| `useScheduleWeek` | Full weekly schedule data |
| `useFocusSession` / `useFocusHistory` | Focus mode state |
| `useNotifications` | Push notification management |
| `useInstallPrompt` | PWA install prompt |
| `useWikiStats` / `useWikiSources` / `useWikiRecent` / `useWikiPage` / `useWikiSearch` / `useWikiAiSearch` / `useWikiGraph` | Wiki data hooks |
| `useWikiAgentStatus` / `useWikiAgentProfiles` | Wiki AI agent management |

### Context
- `XpContext` — Global XP state provider wrapping all routes

### Runtime Detection
- `runtime/config.ts` — `isDesktopRuntime()` checks `window.__PROTOCOL_RUNTIME__`
- App uses `HashRouter` in desktop mode, `BrowserRouter` in web mode

### API Layer
- `api/client.ts` — Axios instance with baseURL `/api` (or desktop API URL)
- `constants/api.ts` — `API_ENDPOINTS` object with all endpoint paths and dynamic path builders

### Types
- `types/index.ts` — Core types (BlockDto, NowResponse, HabitStatus, etc.)
- `types/wiki.ts` — Wiki types (VaultSource, WikiPageMeta, WikiPage, WikiStats, WikiSearchResult, WikiGraphData, WikiAgentProfile, etc.)

### Design System (Tailwind v4 @theme)
Colors: `bg`, `surface-1`, `surface-2`, `border`, `text-primary`, `text-dim`, `accent-purple`, `accent-cyan`, plus block type colors (football, gym, ml, content, reading, work, rest, off, routine, deep)

## Widget (Electron 28)

### Architecture
- Separate `widget/` package with its own `package.json`, TypeScript config, and Vite build
- Main process (`src/main/`) — Electron main process with IPC handlers
- Renderer (`src/renderer/`) — Lightweight React app for widget UI
- Shared types (`src/shared/types.ts`) — IPC channel names, state interfaces

### Main Process Modules
| Module | Purpose |
|--------|---------|
| `main.ts` | App lifecycle, window creation, IPC setup |
| `embedded-api.ts` | Spawns .NET API as child process, discovers port |
| `api-poller.ts` | Polls the embedded API for schedule/habits/wiki state |
| `window-manager.ts` | Persists window position, mode, preferences via `electron-store` |
| `tray.ts` | System tray icon with context menu |
| `shortcuts.ts` | Global keyboard shortcuts |
| `native-messaging.ts` | Chrome/Firefox native messaging host for extension communication |
| `auto-launch.ts` | System startup registration |
| `preload.ts` | Context bridge exposing typed IPC API to renderer |
| `safe-log.ts` | Logging guards for native-messaging mode |

### Widget Modes
- **Compact** (60px): Current block color bar + label + countdown
- **Expanded** (300px): Full view with habits, next block, wiki stats
- Animated height transition with ease-out cubic easing

### Key Features
- Click-through transparency (hover-to-interact pattern)
- Draggable to any screen position
- Corner snapping via tray menu
- Auto-show on first non-rest block detection
- Wiki pending count + compile trigger from widget

## Project Structure
```
personal_tracker/
├── backend/Protocol.Api/          # .NET 8 Web API
│   ├── Controllers/               # 8 API controllers
│   ├── Models/                    # 13 EF Core entities
│   ├── Services/                  # 12 business logic services
│   ├── Data/                      # DbContext, Seeder, Migrations
│   └── Program.cs                 # App entry point
├── frontend/                      # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.ts          # Axios instance
│   │   ├── components/            # layout, dashboard, wiki, settings, shared
│   │   ├── constants/api.ts       # API_ENDPOINTS
│   │   ├── context/XpContext.tsx   # XP provider
│   │   ├── hooks/                 # Custom React hooks
│   │   ├── pages/                 # Route pages + wiki sub-pages
│   │   ├── runtime/config.ts      # Desktop runtime detection
│   │   ├── types/                 # TypeScript interfaces
│   │   ├── App.tsx                # Router setup
│   │   └── index.css              # Tailwind @theme + globals
│   └── vite.config.ts
├── widget/                        # Electron desktop app
│   ├── src/main/                  # Main process (9 modules)
│   ├── src/renderer/              # Widget React UI
│   ├── src/shared/types.ts        # IPC types
│   └── package.json
├── docs/
│   ├── CLAUDE.md                  # Full project spec
│   └── TICKETS.md                 # Phased build plan
└── memory-bank/                   # AI context files
```
