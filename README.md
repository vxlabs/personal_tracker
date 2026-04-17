# Protocol

> A personal discipline enforcement system with a dark cyberpunk aesthetic.

![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)
![.NET 8](https://img.shields.io/badge/.NET-8.0-512BD4)
![React 18](https://img.shields.io/badge/React-18-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6)

Protocol tracks your daily schedule, habits, focus sessions, and XP — and enforces focus blocks by blocking distracting websites through a paired browser extension.

---

## Features

- **Schedule** — Full weekly time-block schedule with a live current-block indicator
- **Habits** — Daily habit tracking with streak calculation and weekend-aware logic
- **Focus Mode** — Timed focus sessions with an immersive fullscreen overlay
- **Site Blocker** — Browser extension blocks distracting sites during focus blocks
- **Daily Review** — Three-point daily reflection with calendar heatmap
- **Weekly Report** — Auto-generated stats: habit compliance, focus hours, streaks, overall score
- **XP & Ranks** — Gamified XP system with rank progression
- **Desktop Widget** — Always-on-top Electron overlay showing current block + timer
- **PWA** — Installable on mobile with offline caching and background sync
- **Push Notifications** — Block transition alerts, habit reminders, sleep warnings

---

## Stack

| Layer | Technology |
|---|---|
| Backend | .NET 8 · ASP.NET Core · EF Core 8 · SQLite · WebPush (VAPID) |
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS v4 · Zustand · Axios |
| Extension (Chrome/Edge) | Manifest V3 · Vanilla JS |
| Extension (Firefox) | Manifest V2 · Vanilla JS |
| Desktop Widget | Electron · React · TypeScript |

---

## Project Structure

```
personal_tracker/
├── backend/
│   └── Protocol.Api/          # .NET 8 Web API
│       ├── Controllers/
│       ├── Models/
│       ├── Services/
│       └── Data/
├── frontend/                  # React + Vite SPA
│   └── src/
├── extension/                 # Chrome / Edge extension (Manifest V3)
├── extension-firefox/         # Firefox extension (Manifest V2)
├── widget/                    # Electron desktop widget
│   └── src/
├── docs/
│   └── wiki/                  # Wiki pages
├── docker-compose.yml
└── LICENSE
```

---

## Prerequisites

| Tool | Version | Download |
|---|---|---|
| .NET SDK | 8.0+ | [dotnet.microsoft.com/download/dotnet/8.0](https://dotnet.microsoft.com/download/dotnet/8.0) |
| Node.js | 18+ (LTS recommended) | [nodejs.org/en/download](https://nodejs.org/en/download) |
| npm | 9+ | Bundled with Node.js |
| web-ext *(Firefox signing only)* | latest | `npm install -g web-ext` |

> **Verify your installs:**
> ```bash
> dotnet --version   # should print 8.x.x
> node --version     # should print v18.x.x or higher
> npm --version      # should print 9.x.x or higher
> ```

---

## Quick Start

### Backend

```bash
cd backend/Protocol.Api
dotnet restore
dotnet run
```

API starts at **`http://localhost:5000`**. The SQLite database is created automatically at `./data/protocol.db` on first run.

### Frontend

```bash
cd frontend
npm install
npm run dev        # dev server at http://localhost:5173
npm run build      # production build → frontend/dist/
```

The dev server proxies all `/api` requests to `:5000`.

### Docker (full stack)

```bash
docker-compose up --build
```

Runs backend on `:5000` and frontend on `:3000`. SQLite data persists in a local `./data/` volume.

---

## API Reference

| Group | Base Path |
|---|---|
| Schedule | `GET /api/schedule` · `GET /api/schedule/now` · `GET /api/schedule/{day}` |
| Habits | `GET /api/habit` · `POST /api/habit/{id}/check` · `DELETE /api/habit/{id}/check` |
| Focus | `POST /api/focus/start` · `POST /api/focus/stop` · `GET /api/focus/sessions` |
| Blocked Sites | `GET /api/blocked-sites` · `POST /api/blocked-sites` · `DELETE /api/blocked-sites/{id}` |
| XP | `GET /api/xp` · `GET /api/xp/ledger` |
| Notifications | `POST /api/notification/subscribe` · `GET /api/notification/settings` |
| Review | `POST /api/review/daily` · `GET /api/review/daily` · `GET /api/review/weekly` |

Full details → [`docs/wiki/API-Reference.md`](docs/wiki/API-Reference.md)

---

## Browser Extensions

The extensions poll the backend every 60 seconds, update the icon badge with minutes remaining, and block configured domains during focus blocks.

### Chrome / Edge (Unpacked — no store needed)

1. Open `chrome://extensions` → enable **Developer mode**
2. Click **Load unpacked** → select the `extension/` folder
3. Pin the Protocol icon in your toolbar

The extension persists across restarts automatically.

### Firefox (Self-signed — personal use)

Firefox requires all extensions to be signed. Sign as **unlisted** via Mozilla AMO (free, not publicly listed):

1. Install the signing tool: `npm install -g web-ext`
2. Get AMO API credentials at `https://addons.mozilla.org/developers/addon/api/key/`
3. Sign the extension:
   ```bash
   cd extension-firefox
   web-ext sign --api-key=YOUR_JWT_ISSUER --api-secret=YOUR_JWT_SECRET --channel=unlisted
   ```
4. Install the generated `.xpi` via `about:addons` → gear icon → **Install Add-on From File**

#### Firefox Developer Edition / Nightly (unsigned)

1. `about:config` → set `xpinstall.signatures.required` to `false`
2. `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `extension-firefox/manifest.json`

> This method does NOT work on standard Firefox releases.

Full extension guide → [`docs/wiki/Browser-Extensions.md`](docs/wiki/Browser-Extensions.md)

---

## Desktop Widget

An always-on-top Electron window that floats in the corner of your screen, showing the current block, countdown timer, and habit dots.

### Development

```bash
cd widget
npm install
npm run dev        # hot-reloading dev mode
```

### Packaging

The widget embeds the backend API and frontend bundle into a single self-contained installer. Build the installer for your platform:

```bash
cd widget
npm install

# Windows — produces release/Protocol Setup <version>.exe
npm run package:win

# macOS — produces release/<version>.dmg
npm run package:mac

# Current OS (auto-detected)
npm run package
```

The output is written to `widget/release/`:

| File | Description |
|---|---|
| `Protocol Setup 1.0.0.exe` | NSIS one-click installer (Windows) |
| `win-unpacked/Protocol.exe` | Unpacked binary — run without installing |
| `*.blockmap` | Used by electron-updater for delta updates |

> **Note:** On Windows, `electron-builder` uses `rcedit` to embed version metadata into the `.exe`. Windows Defender may block it, producing a non-fatal warning. The installer still works correctly. To suppress the warning, add `C:\Users\<you>\AppData\Local\electron-builder\Cache\winCodeSign\` to Windows Security exclusions.

### Installing

Run the installer (`Protocol Setup 1.0.0.exe`) or launch `win-unpacked/Protocol.exe` directly. The app installs per-user (no admin required) and appears in the system tray. It starts hidden and auto-shows when the first non-rest block is detected.

Full widget guide → [`docs/wiki/Desktop-Widget.md`](docs/wiki/Desktop-Widget.md)

---

## Deploying to a Server

When deploying the backend to a remote host, update the API base URL in both extensions before signing/loading:

**`extension/background.js` and `extension-firefox/background.js` — line 1:**
```js
const API_BASE = 'https://your-api-domain.com/api';
```

Update `host_permissions` in both `manifest.json` files to match the new domain. The backend CORS policy must allow `chrome-extension://` and `moz-extension://` origins.

---

## Environment Notes

- **Timezone:** All time logic uses IST (UTC+5:30). The backend resolves this via `TimeZoneInfo`.
- **VAPID keys:** Stored in `appsettings.json`. Do **not** commit production keys to a public repo.
- **Database:** `protocol.db` is gitignored and created on first run.

---

## Documentation

| Page | Description |
|---|---|
| [Architecture](docs/wiki/Architecture.md) | System design, data flow, component overview |
| [API Reference](docs/wiki/API-Reference.md) | All endpoints with request/response examples |
| [Browser Extensions](docs/wiki/Browser-Extensions.md) | Install, configure, and deploy both extensions |
| [Desktop Widget](docs/wiki/Desktop-Widget.md) | Electron widget setup and usage |
| [Gamification](docs/wiki/Gamification.md) | XP system and rank progression |
| [Roadmap](docs/wiki/Roadmap.md) | Build tickets and feature status |

---

## License

[MIT](LICENSE) — Copyright (c) 2026 Sadique P
