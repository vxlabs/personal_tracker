# System Patterns — Protocol App

## Backend Patterns

### Controller Pattern
- Primary constructor DI: `public class XController(XService service) : ControllerBase`
- `[ApiController]` + `[Route("api/...")]` attributes
- Async methods returning `IActionResult` (Ok, NotFound, BadRequest)
- Try/catch with `KeyNotFoundException` for 404s
- Record DTOs for request/response shapes defined alongside controllers

### Service Pattern
- Primary constructor DI: `public class XService(ProtocolDbContext db)`
- Private static IST timezone resolution (cross-platform: `India Standard Time` / `Asia/Kolkata`)
- Static `TodayIst()` helper for current IST date
- Record DTOs defined in service files (e.g., `HabitStatusDto`, `XpDeltaDto`)

### XP / Gamification Pattern
- Append-only `XpLedgerEntry` table with unique `SourceKey` for idempotent awards
- `TryAwardAsync(sourceKey, amount, label)` — no-op if already awarded
- `RemoveEntryAsync(sourceKey)` — reverses XP when actions are undone (e.g., habit uncheck)
- `BuildDeltaAsync()` returns before/after rank comparison for UI rank-up animations
- Rank thresholds defined as a static array of `(Name, MinXp)` tuples

### Wiki / Vault Pattern
- **Capture → Extract → Save → Compile → Index** pipeline
- Raw sources saved as markdown in `vault/raw/` with date-prefixed slugs
- Compiled wiki pages saved in `vault/wiki/{type}/{slug}.md` with YAML frontmatter
- `VaultFileWatcher` (FileSystemWatcher) auto-indexes `.md` files into `WikiPages` DB table
- `WikiSearchService` uses SQLite FTS5 virtual table for full-text search, falls back to LIKE queries
- AI operations delegate to external CLI tools via `WikiAgentService` (process spawning with stdin/stdout)

### Streak Calculation
- `StreakCalculator` is a static utility class
- Bitmask for applicable days: Sun=1, Mon=2, Tue=4, Wed=8, Thu=16, Fri=32, Sat=64 (0=all days)
- Scans backward up to 3 years from today
- Non-applicable days are skipped (don't break or count)
- Today incomplete = neither counts nor breaks (user still has time)

### EF Core Conventions
- Value converters for SQLite compatibility (TimeSpan→string, DateOnly→string)
- Unique composite indexes for business rules
- Auto-migration + seeding on startup
- `.gitignore` in Data/ excludes `.db`, `.db-shm`, `.db-wal`

### Environment Configuration Pattern
- `PROTOCOL_PORT` — dynamic port (0 for auto-assign, used by Electron)
- `PROTOCOL_DATA_DIR` — isolated data directory (for Electron's embedded API)
- `PROTOCOL_VAULT_DIR` — vault directory (defaults to `~/Documents/Protocol-Vault/`)
- `PROTOCOL_API_READY:{port}` printed to stdout for Electron port discovery

## Frontend Patterns

### Component Organization
```
components/
  layout/       → AppShell, Sidebar (structural)
  dashboard/    → WikiWidget, NowCard, etc. (dashboard feature)
  wiki/         → QuickCapture, SourceCard, WikiMarkdown, WikiStatsPanel
  settings/     → WikiAgentSettings, notification toggles
  shared/       → Reusable utilities
pages/          → Route-level components
pages/wiki/     → Wiki sub-pages (Dashboard, Search, Graph, Browser)
hooks/          → Custom React hooks (useWiki*, useFocus*, etc.)
context/        → XpContext
constants/      → API_ENDPOINTS
runtime/        → Desktop runtime detection
types/          → TypeScript interfaces (index.ts, wiki.ts)
```

### Layout Pattern
- `AppShell` wraps all routes via React Router `<Outlet />`
- Sidebar renders both desktop sidebar AND mobile tab bar
- Responsive: `hidden md:flex` (desktop) / `md:hidden` (mobile)
- `XpProvider` context wraps entire router for global XP state

### Styling Pattern
- Tailwind v4 with `@theme` block in `index.css`
- Custom colors as `--color-*` tokens accessible via Tailwind utilities
- Font families: `--font-mono` (JetBrains Mono) and `--font-sans` (DM Sans)
- Card style: `rounded-lg border border-border bg-surface-1` with optional left accent border

### Router Pattern
- React Router v7 with conditional Router: `HashRouter` for desktop, `BrowserRouter` for web
- `NavLink` with `className` callback for active state styling
- Wiki uses catch-all `wiki/*` route with nested sub-routes
- Active state: purple text + background highlight

### API Pattern
- Axios instance at `api/client.ts` with `baseURL: '/api'` (or desktop API URL)
- `API_ENDPOINTS` constants object in `constants/api.ts` — static paths + dynamic path builders
- Vite proxy forwards `/api` → `http://localhost:5000` in dev
- Nginx proxy does the same in Docker production

### Custom Hook Pattern (Wiki example)
- Each hook manages its own `loading` + data state
- `refresh` callback for manual re-fetch
- Action methods (capture, compile, delete) call API then `refresh()`
- Return `{ data, loading, refresh, ...actions }`

### Naming Conventions
- Pages: PascalCase, named after the route (Dashboard.tsx, Wiki.tsx)
- Components: PascalCase, descriptive (NowCard.tsx, QuickCapture.tsx)
- Hooks: camelCase with `use` prefix (useWikiStats.ts, useCurrentBlock.ts)
- Types: PascalCase interfaces with optional `Dto` suffix for API shapes
- Constants: SCREAMING_SNAKE_CASE for static values, camelCase for functions

## Widget (Electron) Patterns

### Embedded API Pattern
- Main process spawns .NET API as child process
- Monitors stdout for `PROTOCOL_API_READY:{port}` message
- Stores discovered port and passes to renderer via IPC
- Graceful shutdown: kills child process on app quit

### IPC Pattern
- `contextBridge.exposeInMainWorld()` in preload script
- Typed IPC channel names in shared `IPC` constant object
- `ipcMain.handle()` for async request-response (getState, getRuntimeConfig)
- `ipcMain.on()` for fire-and-forget (setMode, setIgnoreMouse)
- `webContents.send()` for push updates (state-update)

### Widget Mode Pattern
- Compact (60px) and Expanded (300px) modes
- Animated height transition: `setInterval` with ease-out cubic easing
- Bottom-anchored resize: widget grows/shrinks upward from its bottom edge
- Mode persisted via `electron-store` and synced to tray menu

### Click-Through Pattern
- `setIgnoreMouseEvents(true, { forward: true })` — passes all clicks through to desktop
- `mouseenter` event on renderer → `setIgnoreMouseEvents(false)` — enables interaction
- `mouseleave` event → `setIgnoreMouseEvents(true)` — restores click-through
- Drag detection prevents premature click-through restoration during window moves

### Native Messaging Pattern
- Registers as Chrome/Firefox native messaging host on startup
- When spawned by browser extension, detects via `argv[1]` containing `chrome-extension://`
- Responds with JSON `{ port }` over stdin/stdout protocol
- Exits immediately after responding (no GUI initialization)
