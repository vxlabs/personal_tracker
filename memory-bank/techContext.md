# Tech Context — Protocol App

## Stack
| Layer | Technology | Version |
|-------|-----------|---------|
| Backend | ASP.NET Core Web API (C#) | .NET 8 |
| ORM | Entity Framework Core | 8.0.x |
| Database | SQLite | Single file at `./data/protocol.db` |
| Frontend | React + TypeScript | React 19, TS 6 |
| Bundler | Vite | 8.x |
| CSS | Tailwind CSS | v4 (via `@tailwindcss/vite` plugin) |
| State | Zustand | 5.x |
| HTTP Client | Axios | 1.x |
| Icons | lucide-react | 1.x |
| Date Utils | date-fns | 4.x |
| Routing | react-router-dom | 7.x |
| Push | WebPush (VAPID) | 1.0.12 |
| Containerization | Docker + docker-compose | — |

## Key Technical Decisions
- **Tailwind v4**: No `tailwind.config.js` — uses CSS-based `@theme` block in `index.css` and `@tailwindcss/vite` plugin
- **SQLite**: Single-user app, no need for Postgres. DB file at `./data/protocol.db`
- **No Auth**: Single user, no authentication layer
- **IST timezone**: Hardcoded `India Standard Time` / `Asia/Kolkata` for all time calculations
- **CORS**: Backend allows `http://localhost:5173` in dev
- **Proxy**: Vite dev server proxies `/api` to `http://localhost:5000`; Nginx does the same in Docker

## Build Commands
```bash
# Backend
cd backend/Protocol.Api
dotnet restore && dotnet build && dotnet run   # http://localhost:5000

# Frontend
cd frontend
npm install && npm run dev                      # http://localhost:5173

# Docker
docker-compose up --build
```

## Project Structure
```
personal_tracker/
├── backend/Protocol.Api/          # .NET 8 Web API
│   ├── Controllers/               # API controllers
│   ├── Models/                    # EF Core entity models
│   ├── Services/                  # Business logic
│   ├── Data/                      # DbContext, Seeder, Migrations
│   └── Program.cs                 # App entry point
├── frontend/                      # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.ts          # Axios instance
│   │   ├── components/layout/     # AppShell, Sidebar
│   │   ├── pages/                 # Route pages
│   │   ├── types/index.ts         # TypeScript interfaces
│   │   ├── App.tsx                # Router setup
│   │   └── index.css              # Tailwind @theme + globals
│   └── vite.config.ts
├── docs/
│   ├── CLAUDE.md                  # Full project spec
│   └── TICKETS.md                 # Phased build plan
└── memory-bank/                   # AI context files
```

## TypeScript Config
- `verbatimModuleSyntax: true` — must use `import type` for type-only imports
- `noUnusedLocals: true` / `noUnusedParameters: true` — strict unused checks
- Project references: `tsconfig.app.json` (sources) + `tsconfig.node.json` (Vite config)

## EF Core Conventions
- TimeSpan stored as `"HH:mm"` strings in SQLite
- DateOnly stored as `"yyyy-MM-dd"` strings in SQLite
- Auto-migration + seeding on startup in `Program.cs`
- Unique constraints: HabitLog (habitId+date), DailyReview (date), HabitDefinition (key), BlockedSite (domain)
