# System Patterns — Protocol App

## Backend Patterns

### Controller Pattern
- Primary constructor DI: `public class XController(XService service) : ControllerBase`
- `[ApiController]` + `[Route("api/...")]` attributes
- Async methods returning `IActionResult` (Ok, NotFound)
- Try/catch with `KeyNotFoundException` for 404s

### Service Pattern
- Primary constructor DI: `public class XService(ProtocolDbContext db)`
- Private static IST timezone resolution (cross-platform: `India Standard Time` / `Asia/Kolkata`)
- Static `TodayIst()` helper for current IST date
- Record DTOs defined in service files (e.g., `HabitStatusDto`)

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

## Frontend Patterns

### Component Organization
```
components/
  layout/    → AppShell, Sidebar (structural)
  schedule/  → WeekView, DayColumn, etc. (feature-specific)
  shared/    → Reusable utilities
pages/       → Route-level components
hooks/       → Custom React hooks
stores/      → Zustand stores
```

### Layout Pattern
- `AppShell` wraps all routes via React Router `<Outlet />`
- Sidebar renders both desktop sidebar AND mobile tab bar
- Responsive: `hidden md:flex` (desktop) / `md:hidden` (mobile)

### Styling Pattern
- Tailwind v4 with `@theme` block in `index.css`
- Custom colors as `--color-*` tokens accessible via Tailwind utilities
- Font families: `--font-mono` (JetBrains Mono) and `--font-sans` (DM Sans)
- Card style: `rounded-lg border border-border bg-surface-1` with optional left accent border

### Navigation Pattern
- React Router v7 with `BrowserRouter` + nested `Routes`
- `NavLink` with `className` callback for active state styling
- `end` prop on index route to match exactly `/`
- Active state: purple text + left border + surface background

### API Pattern
- Axios instance at `api/client.ts` with `baseURL: '/api'`
- Vite proxy forwards `/api` → `http://localhost:5000` in dev
- Nginx proxy does the same in Docker production

### Naming Conventions
- Pages: PascalCase, named after the route (Dashboard.tsx, Schedule.tsx)
- Components: PascalCase, descriptive (NowCard.tsx, WeekView.tsx)
- Hooks: camelCase with `use` prefix (useCurrentBlock.ts)
- Types: PascalCase interfaces with `Dto` suffix for API shapes
