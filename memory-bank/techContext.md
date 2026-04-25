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
| Desktop Shell | Electron | 28.x |
| Desktop Storage | electron-store | 8.1.x |
| Desktop Build | electron-builder | 24.x |
| HTML→Markdown | ReverseMarkdown (.NET) | 4.6.0 |
| YAML Parsing | YamlDotNet (.NET) | 16.1.3 |
| Windows Service | Microsoft.Extensions.Hosting.WindowsServices | 8.0.x |

## Key Technical Decisions
- **Tailwind v4**: No `tailwind.config.js` — uses CSS-based `@theme` block in `index.css` and `@tailwindcss/vite` plugin
- **SQLite**: Single-user app, no need for Postgres. DB file at `./data/protocol.db`
- **SQLite FTS5**: Full-text search virtual table for wiki search (with LIKE fallback)
- **No Auth**: Single user, no authentication layer
- **IST timezone**: Hardcoded `India Standard Time` / `Asia/Kolkata` for all time calculations
- **CORS**: Backend allows `http://localhost:5173`, Chrome/Firefox extensions in dev; all origins in production (single-user app)
- **Proxy**: Vite dev server proxies `/api` to `http://localhost:5000`; Nginx does the same in Docker
- **Dual Router**: `HashRouter` for Electron desktop (file:// protocol), `BrowserRouter` for web
- **Embedded API**: Electron spawns .NET API as child process with dynamic port assignment
- **Native Messaging**: Electron registers as browser native messaging host for extension communication
- **AI Delegation**: Wiki compilation/search delegates to external CLI tools (no API keys in app)
- **Vault-on-Disk**: Wiki content lives as `.md` files in a configurable vault directory; DB stores only an index

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

# Widget (Electron)
cd widget
npm install && npm run dev                      # Electron dev mode

# Widget Package
cd widget
npm run package:win                             # Windows installer
```

## Project Structure
```
personal_tracker/
├── backend/Protocol.Api/          # .NET 8 Web API
│   ├── Controllers/               # 8 API controllers + health endpoint
│   ├── Models/                    # 13 EF Core entity models
│   ├── Services/                  # 12 business logic services
│   ├── Data/                      # DbContext, Seeder, 3 Migrations
│   └── Program.cs                 # App entry point
├── frontend/                      # React + Vite + Tailwind
│   ├── src/
│   │   ├── api/client.ts          # Axios instance
│   │   ├── components/            # layout/, dashboard/, wiki/, settings/
│   │   ├── constants/api.ts       # API_ENDPOINTS
│   │   ├── context/XpContext.tsx   # Global XP state
│   │   ├── hooks/                 # useWiki*, useFocus*, etc.
│   │   ├── pages/                 # Route pages + wiki/ sub-pages
│   │   ├── runtime/config.ts      # Desktop runtime detection
│   │   ├── types/                 # index.ts + wiki.ts
│   │   ├── App.tsx                # Router setup (Hash vs Browser)
│   │   └── index.css              # Tailwind @theme + globals
│   └── vite.config.ts
├── widget/                        # Electron 28 desktop app
│   ├── src/main/                  # Main process (9 modules)
│   ├── src/renderer/              # Widget React 18 UI
│   ├── src/shared/types.ts        # IPC channel types
│   ├── package.json               # protocol-desktop v1.1.0
│   └── tsconfig.*.json
├── docs/
│   ├── CLAUDE.md                  # Full project spec
│   └── TICKETS.md                 # Phased build plan
├── dev-desktop.ps1                # Desktop dev launch script
├── package-widget.ps1             # Widget packaging script
└── memory-bank/                   # AI context files
```

## TypeScript Config
- `verbatimModuleSyntax: true` — must use `import type` for type-only imports
- `noUnusedLocals: true` / `noUnusedParameters: true` — strict unused checks
- Project references: `tsconfig.app.json` (sources) + `tsconfig.node.json` (Vite config)
- Widget has separate `tsconfig.main.json` + `tsconfig.renderer.json`

## EF Core Conventions
- TimeSpan stored as `"HH:mm"` strings in SQLite
- DateOnly stored as `"yyyy-MM-dd"` strings in SQLite
- Auto-migration + seeding on startup in `Program.cs`
- Unique constraints: HabitLog (habitId+date), DailyReview (date), HabitDefinition (key), BlockedSite (domain), XpLedgerEntry (sourceKey), VaultSource (slug), WikiPageIndex (filePath)

## Environment Variables
| Variable | Purpose | Default |
|----------|---------|---------|
| `PROTOCOL_PORT` | API listen port (0 = auto) | 5000 |
| `PROTOCOL_DATA_DIR` | Database directory | `./data/` |
| `PROTOCOL_VAULT_DIR` | Wiki vault directory | `~/Documents/Protocol-Vault/` |
| `PROTOCOL_API_BASE_URL` | External API URL (widget dev mode) | — |
