# Active Context — Protocol App

## Current Status
**Phase 5 in progress** — Local Website Activity Intelligence
All original scope features are shipped, including Chrome/Edge and Firefox browser extensions for focus enforcement. The next local-first expansion adds website activity tracking, productivity tagging, and on-device ML.NET classification.

## Active Implementation Focus

### Website Activity Tracking + Local ML
- Track active browser time locally via Chrome/Edge and Firefox extensions
- Count only active focused-tab time; stop counting after 2 minutes of browser idle or browser blur
- Store URL identity as origin + path, with query strings and fragments stripped before persistence
- Persist visit sessions, manual productivity labels, ML training runs, and prediction metadata in SQLite
- Classify websites into Productive, Neutral, or Distracting using manual labels first and ML.NET predictions second
- Train the ML.NET model on demand, with a minimum of 3 examples per label before training
- Surface summaries, top domains, top URLs, unclassified visits, tagging controls, and model status in the frontend Activity page

## Recently Completed Features

### Gamification / XP System (Ticket 16 + expanded)
- `XpLedgerEntry` model with `SourceKey` dedup and `Amount` tracking
- `XpService` with rank progression: Recruit (0) → Soldier (500) → Sergeant (1500) → Lieutenant (3000) → Captain (5000) → Commander (8000) → General (12000)
- XP awarded for: habit check (+10), perfect day (+50), 7/14/30-day streaks (+100/200/500), focus sessions (+5 per 30min), wiki capture (+15), wiki compile (+30), daily review (+20)
- `XpContext` React context provider wrapping the entire app
- Sidebar displays current rank + XP + distance to next rank

### Wiki / Vault Knowledge System
- **Capture**: `POST /api/wiki/capture` — saves URL content or manual notes to vault as markdown files
- **Content Extraction**: `ContentExtractorService` — fetches and converts web pages (articles, Twitter, Reddit, YouTube, GitHub, arXiv) to clean markdown using `ReverseMarkdown`
- **Compile**: `WikiCompileService` — uses configurable CLI AI agents to process raw sources into structured wiki pages (entity, concept, topic, synthesis types)
- **Search**: `WikiSearchService` with SQLite FTS5 full-text search + LIKE fallback
- **AI Search**: `POST /api/wiki/search/ai` — LLM-powered semantic Q&A over the wiki, with file synthesis to save answers as new pages
- **Browse**: Page viewer, recent pages, knowledge graph (nodes + edges), vault index, log
- **Stats**: Source/page counts by type and status
- **Vault File Watcher**: `VaultFileWatcher` singleton monitors the vault directory for changes, auto-indexes new/modified `.md` files into `WikiPages` table
- **Vault Init**: `VaultInitService` creates default directory structure and starter files

### Wiki AI Agent Profiles
- `WikiAgentProfile` model — configurable CLI executables (Claude Code, GPT CLI, Ollama, etc.)
- `WikiAgentController` — CRUD for profiles, set default, test connectivity
- `WikiAgentService` — spawns CLI processes with prompt templates, manages timeouts
- Settings UI: `WikiAgentSettings` component for managing agent configurations

### Desktop Widget (Electron)
- **Electron app** (`widget/`) — separate package with its own build pipeline
- **Embedded API**: Spawns the .NET backend as a child process, auto-discovers port
- **Widget window**: Frameless, transparent, always-on-top, click-through with hover-to-interact
- **Compact mode**: Single-line showing current block type + label + time remaining
- **Expanded mode**: Full view with habits, next block, wiki pending count
- **Tray icon**: Menu with mode toggle, always-on-top, corner positioning, start-on-boot
- **Native messaging**: Chrome/Firefox extension host for querying live API port
- **IPC**: `contextBridge` preload with typed channels for state sync
- **Auto-launch**: System startup registration
- **Window manager**: Persists position, mode, always-on-top, start-on-boot via `electron-store`

### Desktop Main Window
- Full Protocol frontend loaded inside Electron's `BrowserWindow`
- Uses `HashRouter` (not `BrowserRouter`) when in desktop runtime
- `isDesktopRuntime()` config detection via `window.__PROTOCOL_RUNTIME__`
- Shares the same embedded API server as the widget

### Browser Extensions
- Chrome/Edge extension lives in `extension/` and uses Manifest V3
- Firefox extension lives in `extension-firefox/` and uses Manifest V2
- Firefox build artifact `protocol-firefox.xpi` is present for installation/signing workflow
- Both extensions integrate with the desktop native messaging host for dynamic API port discovery

## Next Up
| Ticket | Description | Estimate |
|--------|-------------|----------|
| TICKET-A01 | Website activity data model, API, and ML.NET service | 90 min |
| TICKET-A02 | Chrome/Firefox active-tab telemetry | 75 min |
| TICKET-A03 | Activity dashboard, tagging, and training UI | 90 min |
| TICKET-E01 | Optional extension upgrade — TypeScript/React scaffold for Knowledge Clipper | 45 min |

## Active Architecture Decisions
- Wiki vault lives on-disk at `PROTOCOL_VAULT_DIR` (default: `~/Documents/Protocol-Vault/`); the DB only stores an index
- AI agent compilation delegates to external CLI tools (Claude Code, GPT, etc.) — no API keys stored in the app itself
- The Electron widget embeds the .NET API as a child process and communicates via HTTP
- The frontend detects desktop vs. web runtime and switches Router accordingly
- `PROTOCOL_PORT` and `PROTOCOL_DATA_DIR` env vars allow the embedded API to use dynamic ports and isolated data directories
- Website activity remains local-only; no cloud telemetry or external classification service is introduced
- Website labels are privacy-sensitive user data, so manual labels override ML predictions and URL storage strips query strings/fragments
