# Protocol

> A personal discipline enforcement system — schedule awareness, habit tracking, focus sessions, website activity intelligence, and a knowledge wiki, all running locally with a dark cyberpunk aesthetic.

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4)
![React 18](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)
![Electron](https://img.shields.io/badge/Electron-28-47848F)
![ML.NET](https://img.shields.io/badge/ML.NET-On--Device-742774)

<p align="center">
  <b>Schedule · Habits · Focus · Activity Intelligence · Wiki · XP</b>
</p>

---

## What Is Protocol?

Protocol answers one question: **"What should I be doing RIGHT NOW?"**

It combines a weekly time-block schedule, habit tracker, timed focus sessions, browser-level site blocking, a personal knowledge wiki, and an XP gamification system into a single local-first app. A desktop widget floats on your screen as a constant reminder. Browser extensions enforce focus blocks by blocking distracting sites. And an on-device ML model learns your browsing patterns to automatically classify website activity as Productive, Neutral, or Distracting.

Everything runs on your machine. No cloud. No accounts. No subscriptions.

---

## Features

| Feature | Description |
|---------|-------------|
| **NOW Card** | A large, impossible-to-ignore card showing your current schedule block and countdown |
| **Schedule** | Full weekly time-block schedule with live current-block indicator |
| **Habits** | Daily habit tracking with streak calculation and weekend-aware logic |
| **Focus Mode** | Timed focus sessions with an immersive fullscreen overlay |
| **Site Blocker** | Browser extensions block distracting sites during focus blocks |
| **Activity Intelligence** | Tracks browser activity and classifies productivity using on-device ML (see below) |
| **Knowledge Wiki** | Capture URLs/notes → AI extracts markdown → compiles into wiki pages → full-text search |
| **Daily Review** | Three-point daily reflection with calendar heatmap |
| **Weekly Report** | Auto-generated stats: habit compliance, focus hours, streaks, overall score |
| **XP & Ranks** | Gamified XP system with military rank progression (Recruit → General) |
| **Desktop Widget** | Always-on-top Electron overlay showing current block + timer + habit dots |
| **PWA** | Installable on mobile with offline caching and background sync |
| **Push Notifications** | Block transition alerts, habit reminders, sleep warnings |

---

## On-Device ML: Why and How It Works

The **Activity Intelligence** feature is one of Protocol's most interesting technical pieces. Here's why it exists and how it improves the app.

### The Problem

Manually labeling every website you visit doesn't scale. A typical day generates 50–200 distinct page visits across dozens of domains. And many domains are **ambiguous** — YouTube hosts university lectures and cat compilations on the same hostname, GitHub has your work repos and trending memes, Google serves search results for "distributed systems paper" and "best pizza near me."

Rule-based approaches (blocklists, allow-lists, domain-level tags) can't distinguish these. You need something that understands *what* you were looking at, not just *where*.

### The Solution: A Personal ML Classifier

Protocol trains an **ML.NET multiclass classifier** (`SdcaMaximumEntropy`) directly on your machine, using your own manually labeled examples. It learns *your* definition of productive vs distracting — not some generic model.

The classifier uses **three text features** that together capture enough signal to generalize:

| Feature | What It Captures | Example |
|---------|-----------------|---------|
| **Domain** | Broad site category | `github.com` → likely productive, `reddit.com` → likely distracting |
| **URL path + query** | Specific resource within a domain | `/watch?v=dQw4w9WgXcQ` vs `/watch?v=MLlecture01` |
| **Page title** | Human-readable content summary | "Intro to Kubernetes" vs "Funny Fails Compilation" |

The page title is the **strongest signal** — titles like "React Performance Optimization" vs "Top 10 Memes" are immediately separable even on identical domains.

### How It Improves the App

- **Real-Time Classification** — Every browser heartbeat gets a Productive/Neutral/Distracting label and confidence score the moment it arrives. No manual tagging needed for sites the model has seen patterns for.

- **Meaningful Dashboards** — The activity dashboard (time-by-label charts, domain groups, weekly summaries) is only useful when sessions are labeled. Without ML, most sessions show "Unclassified" and the charts are meaningless.

- **Human-in-the-Loop** — Manual labels always override ML predictions. Corrections become training examples for the next model iteration. The model converges toward your preferences over time.

- **Zero Cloud Dependency** — Trains and runs entirely on your machine using ML.NET. No API calls, no data leaves your device. The model is a single `.zip` file (~KB).

- **Low Data Requirements** — The model trains with as few as **9 labeled examples** (3 per category). As you label more, accuracy improves.

### Technical Details

- **Algorithm:** SDCA Maximum Entropy — a linear multiclass classifier that trains in seconds on small datasets
- **Pipeline:** Domain, URL, and Title are independently featurized via bag-of-words/n-grams, then concatenated into a single feature vector
- **Priority Cascade:** Manual label → ML prediction → Unclassified (human intent is never overridden)
- **Schema Safety:** If the model was trained with an older feature set, the prediction engine gracefully returns null instead of crashing
- **Storage:** Model persisted to `Data/ml/website-productivity.zip`

### Future ML Enhancements

We're looking for contributors to help build these next-generation features:

| Enhancement | Impact | Difficulty |
|-------------|--------|------------|
| Time-of-day features | Same site can be productive at 10am and distracting at 10pm | Medium |
| Active-seconds weighting | Long sessions contribute more to training than 2-second blips | Easy |
| Cross-session context | Sequential patterns (GitHub → SO → Docs = productive work session) | Hard |
| Confidence thresholds | Low-confidence predictions surfaced for manual review | Easy |
| Per-domain micro-models | Specialized classifiers for ambiguous domains (YouTube, Reddit) | Medium |
| Model evaluation metrics | Track precision/recall/F1 across retrain cycles | Medium |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | .NET 8 · ASP.NET Core · EF Core 8 · SQLite · ML.NET · WebPush (VAPID) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Axios |
| Extension (Chrome/Edge) | Manifest V3 · Vanilla JS |
| Extension (Firefox) | Manifest V2 · Vanilla JS |
| Desktop Widget | Electron 28 · React · TypeScript · electron-builder |
| Desktop Capture | FlaUI (Windows UI Automation) for browser URL extraction |

---

## Project Structure

```
personal_tracker/
├── backend/Protocol.Api/          # .NET 8 Web API
│   ├── Controllers/               # REST API controllers
│   ├── Models/                    # EF Core entities
│   ├── Services/                  # Business logic + ML classifier
│   └── Data/                      # DbContext, migrations, seeder
├── frontend/                      # React + Vite SPA
│   └── src/
│       ├── components/            # UI components (dashboard, wiki, settings)
│       ├── hooks/                 # Custom React hooks
│       ├── pages/                 # Route pages + wiki sub-pages
│       ├── constants/api.ts       # API_ENDPOINTS (never hard-code URLs)
│       └── types/                 # TypeScript interfaces
├── extension/                     # Chrome / Edge extension (Manifest V3)
├── extension-firefox/             # Firefox extension (Manifest V2)
├── widget/                        # Electron desktop widget
│   ├── src/main/                  # Main process (embedded API, poller, tray)
│   ├── src/renderer/              # Widget React UI
│   └── electron-builder.json      # Packaging config
├── docs/wiki/                     # Project wiki pages
├── package-widget.ps1             # One-command packaging script
├── dev-desktop.ps1                # Desktop development launcher
└── docker-compose.yml
```

---

## Getting Started

### Prerequisites

| Tool | Version | Download |
|------|---------|----------|
| .NET SDK | 8.0+ | [dotnet.microsoft.com](https://dotnet.microsoft.com/download/dotnet/8.0) |
| Node.js | 18+ LTS | [nodejs.org](https://nodejs.org/en/download) |
| npm | 9+ | Bundled with Node.js |

```bash
dotnet --version   # 8.x.x
node --version     # v18+
npm --version      # 9+
```

### Backend

```bash
cd backend/Protocol.Api
dotnet restore
dotnet run
```

API starts at **`http://localhost:5000`**. SQLite database is created automatically on first run.

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
```

The dev server proxies `/api` requests to `:5000`.

### Docker (Full Stack)

```bash
docker-compose up --build
```

Backend on `:5000`, frontend on `:3000`. SQLite data persists in `./data/`.

### Desktop Widget (Development)

```bash
cd widget
npm install
npm run dev
```

### Desktop Widget (Packaging)

Build the full installer (publishes .NET API + builds Electron app + creates NSIS installer):

```powershell
.\package-widget.ps1
```

Output: `widget/release/Protocol Setup <version>.exe`

---

## API Reference

| Group | Endpoints |
|-------|-----------|
| Schedule | `GET /api/schedule` · `GET /api/schedule/now` · `GET /api/schedule/{day}` · `PUT /api/schedule/{day}` |
| Habits | `GET /api/habits/today` · `POST /api/habits/{id}/check` · `DELETE /api/habits/{id}/check` |
| Focus | `POST /api/focus/start` · `POST /api/focus/stop` · `GET /api/focus/sessions` |
| Activity | `POST /api/activity/heartbeat` · `POST /api/activity/finalize` · `GET /api/activity/summary` · `GET/PUT /api/activity/labels` · `POST /api/activity/train` · `GET /api/activity/model/status` |
| Wiki | Capture, browse, compile, search, sync |
| XP | `GET /api/xp` · `GET /api/xp/ledger` |
| Notifications | Subscribe, settings, VAPID key |
| Review | Daily review CRUD, weekly report |
| Blocked Sites | CRUD + toggle |

Full details → [`docs/wiki/API-Reference.md`](docs/wiki/API-Reference.md)

---

## Browser Extensions

Extensions poll the backend every 60s, update the icon badge with minutes remaining, and block configured domains during focus blocks.

### Chrome / Edge

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `extension/` folder
3. Pin the Protocol icon in your toolbar

### Firefox

Firefox requires signed extensions. Sign as **unlisted** via Mozilla AMO:

```bash
npm install -g web-ext
cd extension-firefox
web-ext sign --api-key=YOUR_JWT_ISSUER --api-secret=YOUR_JWT_SECRET --channel=unlisted
```

Install the generated `.xpi` via `about:addons` → gear → **Install Add-on From File**.

> **Dev/Nightly only:** Set `xpinstall.signatures.required` to `false` in `about:config`, then load via `about:debugging`.

---

## Contributing

We welcome contributions of all sizes. Here's how to get involved.

### Good First Issues

If you're new to the project, look for issues labeled **`good first issue`** or pick from this list:

| Area | Idea | Difficulty |
|------|------|------------|
| ML | Add confidence threshold — surface low-confidence predictions for manual review | Easy |
| ML | Add time-of-day as a training feature | Medium |
| ML | Track precision/recall/F1 metrics across model retrains | Medium |
| Frontend | Add dark/light theme toggle | Easy |
| Frontend | Improve mobile responsiveness of the Activity dashboard | Easy |
| Backend | Add data export (CSV/JSON) for activity sessions | Easy |
| Extension | Migrate Chrome/Firefox extensions to TypeScript + React | Medium |
| Widget | Add macOS/Linux support for desktop activity capture (currently Windows-only via FlaUI) | Hard |
| Docs | Improve API reference with request/response examples | Easy |
| Testing | Add unit tests for ML training pipeline | Medium |
| Testing | Add integration tests for Activity API endpoints | Medium |

### Development Workflow

1. **Fork** the repo and clone your fork
2. **Create a branch** from `main`: `git checkout -b feature/your-feature`
3. **Make your changes** — follow the existing code style:
   - Backend: C# with async/await, `ILogger<T>`, EF Core patterns
   - Frontend: Functional React components, TypeScript strict mode, Tailwind CSS
   - Use `API_ENDPOINTS.*` constants — never hard-code URLs
   - All time logic uses IST (UTC+5:30)
4. **Test** your changes locally (run both backend + frontend)
5. **Commit** with a clear message: `feat: add confidence threshold to ML predictions`
6. **Open a PR** against `main` with a description of what and why

### Architecture Principles

- **Local-first** — Everything runs on the user's machine. No cloud services, no auth, no caching layers.
- **SQLite is correct** — Single-user app, no need for Postgres/Redis.
- **Manual > ML > Unclassified** — Human labels always win. ML fills gaps. Nothing stays unlabeled for long.
- **No over-engineering** — If it works for one user with SQLite and a flat file wiki, that's the right solution.

### Code Style

```
Backend:  async/await everywhere, constructor injection, record DTOs
Frontend: functional components, named exports, Zustand stores, Axios via API_ENDPOINTS
Commits:  feat/fix/refactor/docs: concise description
```

---

## Documentation

| Page | Description |
|------|-------------|
| [Architecture](docs/wiki/Architecture.md) | System design, data flow, component overview |
| [API Reference](docs/wiki/API-Reference.md) | All endpoints with request/response examples |
| [Browser Extensions](docs/wiki/Browser-Extensions.md) | Install, configure, and deploy both extensions |
| [Desktop Widget](docs/wiki/Desktop-Widget.md) | Electron widget setup and usage |
| [Activity Intelligence](docs/wiki/Activity-Intelligence.md) | Website activity tracking, ML classification |
| [Gamification](docs/wiki/Gamification.md) | XP system and rank progression |
| [Roadmap](docs/wiki/Roadmap.md) | Build tickets, phases, and feature status |

---

## Environment Notes

- **Timezone:** All time logic uses IST (UTC+5:30) via `TimeZoneInfo`
- **VAPID keys:** Stored in `appsettings.json` — do **not** commit production keys
- **Database:** `protocol.db` is gitignored and created on first run
- **Desktop capture:** Controlled by `PROTOCOL_DESKTOP_ACTIVITY=1` env var (Windows only)
- **Data directory:** Override with `PROTOCOL_DATA_DIR` env var

---

## Releases

Download the latest installer from [GitHub Releases](https://github.com/vxlabs/personal_tracker/releases).

| Asset | Description |
|-------|-------------|
| `Protocol Setup X.Y.Z.exe` | Windows NSIS one-click installer (includes embedded API + frontend) |

The installer is per-user (no admin required). The app appears in the system tray and auto-shows when the first non-rest schedule block is detected.

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Sadique P
