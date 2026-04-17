# DESKTOP.md — Protocol Desktop App (Single Installer)

## The Goal

Bundle everything into one installable desktop app:
- ✅ .NET API (embedded as child process, no separate hosting)
- ✅ React frontend (the Protocol dashboard, Electron renderer)
- ✅ Widget (separate always-on-top BrowserWindow in the same app)
- ✅ SQLite database (local, user data folder)
- ✅ Vault files (local markdown, user-configurable location)

One `.exe` for Windows. One `.dmg` for macOS. User double-clicks, app runs. No Cloudflare Tunnel, no VPS, no "is my server up."

---

## Migration Path (Since Phase 1 Is Already Built)

You're NOT throwing anything away. The .NET API stays exactly the same. The React frontend stays exactly the same. You're adding an Electron shell that bundles them together and adding a few lifecycle hooks.

Existing structure:
```
protocol-app/
├── backend/Protocol.Api/       ← Stays as-is
├── frontend/                   ← Stays as-is (becomes Electron renderer)
└── docs/
```

New structure:
```
protocol-app/
├── backend/Protocol.Api/       ← No changes
├── frontend/                   ← Minor config change (build target)
├── desktop/                    ← NEW: Electron shell
│   ├── package.json
│   ├── tsconfig.json
│   ├── electron-builder.json
│   ├── src/
│   │   ├── main/               ← Electron main process
│   │   ├── widget/             ← Widget renderer
│   │   └── shared/
│   ├── resources/              ← Bundled binaries
│   │   └── api/                ← Compiled .NET API binary goes here
│   └── assets/
├── scripts/
│   ├── build-all.ps1           ← Build script: API → Frontend → Electron
│   └── build-all.sh
└── docs/
```

**Nothing in backend/ or frontend/ gets rewritten.** You just add a new desktop/ project that orchestrates everything.

---

## Architecture: How It All Runs Together

```
┌─────────────────────────────────────────────────────────────┐
│  Protocol.exe (Electron)                                    │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Main Process (Node.js)                                │ │
│  │                                                        │ │
│  │  On app.whenReady():                                   │ │
│  │   1. Spawn Protocol.Api.exe as child process           │ │
│  │      → listens on http://127.0.0.1:{dynamic-port}      │ │
│  │   2. Wait for API health check (poll /api/health)      │ │
│  │   3. Create main window (loads React frontend)         │ │
│  │   4. Create widget window (always-on-top, tray)        │ │
│  │   5. Register global shortcuts, auto-launch            │ │
│  │                                                        │ │
│  │  On app.quit():                                        │ │
│  │   - Gracefully shut down API child process             │ │
│  │   - Save widget position                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Child Process: Protocol.Api.exe (self-contained .NET) │ │
│  │   - SQLite DB at: %APPDATA%/Protocol/protocol.db       │ │
│  │   - Vault at: %USERPROFILE%/Documents/Protocol-Vault/ │ │
│  │   - Listens: 127.0.0.1:{dynamic-port}                  │ │
│  │   - Only accessible from localhost                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Renderer: Main Window (React frontend)                │ │
│  │   - Loaded from: app://local/index.html                │ │
│  │   - Calls API at: http://127.0.0.1:{port}              │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  Renderer: Widget Window (small always-on-top)         │ │
│  │   - Transparent, frameless, 240x60px                   │ │
│  │   - Same API endpoint                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                             │
│  System Tray Icon (persists after window close)             │
└─────────────────────────────────────────────────────────────┘
```

**Key decisions:**

1. **Dynamic port** — API doesn't hardcode :5000. On startup it binds to an available port. Electron reads the chosen port from the child process stdout and passes it to the renderers. This avoids "port already in use" issues if the user has something else on 5000.

2. **127.0.0.1 only (not 0.0.0.0)** — The API binds to localhost only, never the network interface. It's completely inaccessible to other machines. Fully private.

3. **No auth needed** — Single-user, local-only, localhost-only. The threat model doesn't require authentication. Simpler.

4. **Data locations** — Database in platform-appropriate app data folder. Vault in user's Documents folder by default (configurable in settings, and visible so they can open it in Obsidian).

---

## .NET API Changes (Minimal)

Only three small changes to your existing API:

### 1. Read port from environment or arg
```csharp
// Program.cs
var port = Environment.GetEnvironmentVariable("PROTOCOL_PORT") ?? "0";  // 0 = auto-assign
var host = "127.0.0.1";  // localhost only

builder.WebHost.UseUrls($"http://{host}:{port}");

// After app.Start(), print the actual port to stdout so Electron can read it
var server = app.Services.GetRequiredService<IServer>();
var addresses = server.Features.Get<IServerAddressesFeature>();
var actualPort = new Uri(addresses.Addresses.First()).Port;
Console.WriteLine($"PROTOCOL_API_READY:{actualPort}");  // Electron parses this
```

### 2. Read data paths from environment
```csharp
// appsettings or Program.cs
var dataDir = Environment.GetEnvironmentVariable("PROTOCOL_DATA_DIR") 
              ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "Protocol");

var vaultDir = Environment.GetEnvironmentVariable("PROTOCOL_VAULT_DIR")
               ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Documents", "Protocol-Vault");

Directory.CreateDirectory(dataDir);
Directory.CreateDirectory(vaultDir);

// SQLite connection string uses dataDir
var dbPath = Path.Combine(dataDir, "protocol.db");
services.AddDbContext<ProtocolDbContext>(opt => 
    opt.UseSqlite($"Data Source={dbPath}"));
```

### 3. Add /api/health endpoint
```csharp
app.MapGet("/api/health", () => Results.Ok(new { 
    status = "ok", 
    version = "1.0.0",
    uptime = (DateTime.UtcNow - startTime).TotalSeconds 
}));
```

That's it. No other backend changes.

### Publish as self-contained single-file:
```bash
cd backend/Protocol.Api

# Windows
dotnet publish -c Release -r win-x64 --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o ../../desktop/resources/api/win-x64

# macOS (Apple Silicon)
dotnet publish -c Release -r osx-arm64 --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o ../../desktop/resources/api/osx-arm64
```

Output: `Protocol.Api.exe` (~75-90MB), single file, includes .NET runtime. No install needed on user's machine.

---

## Frontend Changes (Minimal)

Two small changes:

### 1. API base URL comes from Electron IPC
```typescript
// frontend/src/api/client.ts

// Check if running inside Electron
const isElectron = !!window.electronAPI;

let apiBaseUrl: string;

if (isElectron) {
  // Get the dynamic port from Electron's main process
  apiBaseUrl = await window.electronAPI.getApiBaseUrl();
  // Returns: http://127.0.0.1:54321 (or whatever port was assigned)
} else {
  // Dev mode or web mode
  apiBaseUrl = 'http://localhost:5000';
}

export const api = axios.create({ baseURL: apiBaseUrl });
```

### 2. Build output goes to desktop/dist/frontend
```typescript
// frontend/vite.config.ts
export default defineConfig({
  base: './',  // Important: relative paths for Electron
  build: {
    outDir: '../desktop/dist/frontend',
    emptyOutDir: true,
  },
  // ... rest stays the same
});
```

That's it. The frontend works identically in Electron as it did in the browser.

---

## Electron Main Process

```typescript
// desktop/src/main/main.ts
import { app, BrowserWindow, Tray, Menu, globalShortcut, ipcMain } from 'electron';
import { spawn, ChildProcess } from 'child_process';
import * as path from 'path';
import * as getPort from 'get-port';

let apiProcess: ChildProcess | null = null;
let apiPort: number = 0;
let mainWindow: BrowserWindow | null = null;
let widgetWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

async function startApi(): Promise<number> {
  const platform = process.platform === 'win32' ? 'win-x64' : 'osx-arm64';
  const apiBinary = app.isPackaged
    ? path.join(process.resourcesPath, 'api', platform, 'Protocol.Api')
    : path.join(__dirname, '../../resources/api', platform, 'Protocol.Api');

  const dataDir = path.join(app.getPath('userData'), 'data');
  const vaultDir = path.join(app.getPath('documents'), 'Protocol-Vault');

  return new Promise((resolve, reject) => {
    apiProcess = spawn(apiBinary, [], {
      env: {
        ...process.env,
        PROTOCOL_PORT: '0',  // Auto-assign
        PROTOCOL_DATA_DIR: dataDir,
        PROTOCOL_VAULT_DIR: vaultDir,
        ASPNETCORE_ENVIRONMENT: 'Production',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    apiProcess.stdout?.on('data', (data) => {
      const output = data.toString();
      console.log('[API]', output);

      // Parse the ready signal
      const match = output.match(/PROTOCOL_API_READY:(\d+)/);
      if (match) {
        apiPort = parseInt(match[1]);
        resolve(apiPort);
      }
    });

    apiProcess.stderr?.on('data', (data) => {
      console.error('[API ERROR]', data.toString());
    });

    apiProcess.on('exit', (code) => {
      console.log(`API exited with code ${code}`);
      if (!apiPort) reject(new Error('API failed to start'));
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!apiPort) reject(new Error('API startup timeout'));
    }, 30_000);
  });
}

async function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#0a0a0f',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  const indexPath = app.isPackaged
    ? path.join(process.resourcesPath, 'frontend/index.html')
    : path.join(__dirname, '../../dist/frontend/index.html');

  await mainWindow.loadFile(indexPath);

  // Hide to tray on close instead of quitting
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow?.hide();
    }
  });
}

async function createWidgetWindow() {
  widgetWindow = new BrowserWindow({
    width: 240,
    height: 60,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    hasShadow: false,
    webPreferences: {
      preload: path.join(__dirname, 'widget-preload.js'),
      contextIsolation: true,
    },
  });

  // Make click-through by default
  widgetWindow.setIgnoreMouseEvents(true, { forward: true });

  const widgetPath = app.isPackaged
    ? path.join(process.resourcesPath, 'widget/index.html')
    : path.join(__dirname, '../widget/index.html');

  await widgetWindow.loadFile(widgetPath);

  // Restore position from settings
  const savedPos = loadWidgetPosition();
  if (savedPos) widgetWindow.setPosition(savedPos.x, savedPos.y);
}

function createTray() {
  tray = new Tray(path.join(__dirname, '../assets/tray-icon.png'));

  const contextMenu = Menu.buildFromTemplate([
    { label: 'Open Protocol', click: () => mainWindow?.show() },
    { label: 'Toggle Widget', click: () => toggleWidget() },
    { type: 'separator' },
    { label: 'Settings', click: () => openSettings() },
    { type: 'separator' },
    { label: 'Quit Protocol', click: () => {
      app.isQuitting = true;
      app.quit();
    }},
  ]);

  tray.setToolTip('Protocol');
  tray.setContextMenu(contextMenu);
  tray.on('click', () => mainWindow?.show());
}

// IPC handlers — renderers ask for the API URL
ipcMain.handle('get-api-base-url', () => `http://127.0.0.1:${apiPort}`);

app.whenReady().then(async () => {
  try {
    await startApi();
    await createMainWindow();
    await createWidgetWindow();
    createTray();
    registerGlobalShortcuts();
  } catch (err) {
    console.error('Failed to start:', err);
    app.quit();
  }
});

app.on('before-quit', () => {
  app.isQuitting = true;
  if (apiProcess) {
    apiProcess.kill();
    apiProcess = null;
  }
});

app.on('window-all-closed', (e) => {
  e.preventDefault();  // Don't quit; stay in tray
});
```

---

## Preload Scripts (Security)

```typescript
// desktop/src/main/preload.ts
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getApiBaseUrl: () => ipcRenderer.invoke('get-api-base-url'),
  showWidget: () => ipcRenderer.invoke('widget-show'),
  hideWidget: () => ipcRenderer.invoke('widget-hide'),
  openVaultFolder: () => ipcRenderer.invoke('open-vault-folder'),
  openSettings: () => ipcRenderer.invoke('open-settings'),
});
```

```typescript
// frontend/src/types/electron.d.ts
declare global {
  interface Window {
    electronAPI?: {
      getApiBaseUrl: () => Promise<string>;
      showWidget: () => Promise<void>;
      hideWidget: () => Promise<void>;
      openVaultFolder: () => Promise<void>;
      openSettings: () => Promise<void>;
    };
  }
}
```

---

## Data Locations

### Windows
- **App data:** `%APPDATA%\Protocol\` (database, logs, settings)
- **Vault:** `%USERPROFILE%\Documents\Protocol-Vault\` (user-configurable)
- **Installer:** `%LOCALAPPDATA%\Programs\Protocol\`

### macOS
- **App data:** `~/Library/Application Support/Protocol/`
- **Vault:** `~/Documents/Protocol-Vault/`
- **App bundle:** `/Applications/Protocol.app`

### User-configurable from Settings
- Vault location (with migration if changed)
- Backup schedule (Phase 3 — auto-backup to local folder or cloud)

---

## Build Pipeline

```powershell
# scripts/build-all.ps1 (Windows)

# 1. Build backend as self-contained single file
Write-Host "Building backend..." -ForegroundColor Cyan
Set-Location backend/Protocol.Api
dotnet publish -c Release -r win-x64 --self-contained true `
  -p:PublishSingleFile=true `
  -p:IncludeNativeLibrariesForSelfExtract=true `
  -o ../../desktop/resources/api/win-x64

# 2. Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location ../../frontend
npm run build  # Outputs to desktop/dist/frontend

# 3. Build Electron app
Write-Host "Building Electron app..." -ForegroundColor Cyan
Set-Location ../desktop
npm run build         # Compile TypeScript
npx electron-builder  # Package into installer

Write-Host "Done! Installer at: desktop/release/" -ForegroundColor Green
```

```bash
#!/bin/bash
# scripts/build-all.sh (macOS)

echo "Building backend..."
cd backend/Protocol.Api
dotnet publish -c Release -r osx-arm64 --self-contained true \
  -p:PublishSingleFile=true \
  -p:IncludeNativeLibrariesForSelfExtract=true \
  -o ../../desktop/resources/api/osx-arm64

echo "Building frontend..."
cd ../../frontend
npm run build

echo "Building Electron app..."
cd ../desktop
npm run build
npx electron-builder --mac

echo "Done! Installer at: desktop/release/"
```

### electron-builder.json

```json
{
  "appId": "com.vxlabs.protocol",
  "productName": "Protocol",
  "directories": {
    "output": "release",
    "buildResources": "assets"
  },
  "files": [
    "dist/**/*",
    "package.json"
  ],
  "extraResources": [
    {
      "from": "resources/api/${os}-${arch}",
      "to": "api",
      "filter": ["**/*"]
    },
    {
      "from": "dist/frontend",
      "to": "frontend"
    },
    {
      "from": "dist/widget",
      "to": "widget"
    }
  ],
  "win": {
    "target": ["nsis"],
    "icon": "assets/icon.ico",
    "publisherName": "vxlabs"
  },
  "mac": {
    "target": [{"target": "dmg", "arch": ["arm64"]}],
    "icon": "assets/icon.icns",
    "category": "public.app-category.productivity",
    "hardenedRuntime": true,
    "gatekeeperAssess": false
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "perMachine": false,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

---

## Install Size Breakdown

| Component | Size |
|-----------|------|
| Electron runtime | ~80MB |
| .NET self-contained API | ~75MB |
| Frontend (minified) | ~2MB |
| Widget (minified) | ~0.5MB |
| Assets, icons | ~1MB |
| **Total installer** | **~160MB** |
| Installed footprint | ~200MB |

Reasonable for a desktop app. For context, Slack is 300MB+, Notion is 250MB+.

---

## Shipping to Others Later (Roadmap)

Since you mentioned "ship to others later," here's what you should keep in mind NOW so you don't have to rework later:

### Do now (zero cost):
1. **Settings are user-configurable** — vault location, schedule, habits, blocked sites. Don't hardcode "Sadique" anywhere in the default data; use empty/placeholder defaults that onboarding fills in.
2. **Onboarding flow** — first-run wizard that sets up the user's schedule, habits, and vault location. Part of Phase 2.
3. **No hardcoded IST** — use system timezone. The app works in any timezone without code changes.
4. **Standardized data export** — the vault is already markdown (portable). Add `/api/export` for database snapshot. Users can take their data and leave.

### Do later (when ready to ship):
1. **License key system** — if you want to charge. Simple: a settings value that unlocks Pro features. Use Stripe for payments + license keys.
2. **Auto-updater** — `electron-updater` package, release notifications, background downloads. Phase 3.
3. **Code signing** — Windows: Authenticode certificate (~$100/year). macOS: Apple Developer account ($99/year) for notarization. Without these, users see scary warnings on install.
4. **Error reporting** — Sentry or similar for crash reports from users.
5. **Landing page** — protocol.vxlabs.in with download links, feature list, demo video.

**Don't build these now.** Build them when you have 10+ real users asking.

---

## Build Tickets

### TICKET-D01: Backend Changes for Embedding
**Estimate:** 30 min
- Add `PROTOCOL_PORT`, `PROTOCOL_DATA_DIR`, `PROTOCOL_VAULT_DIR` environment variable support
- Print `PROTOCOL_API_READY:{port}` on startup
- Add `/api/health` endpoint
- Bind to 127.0.0.1 only
- Verify `dotnet publish -r win-x64 --self-contained -p:PublishSingleFile=true` produces a single exe
- Test the exe runs standalone with env vars

### TICKET-D02: Frontend Changes for Electron
**Estimate:** 30 min
- Add `window.electronAPI` type definition
- Update API client to get base URL from Electron IPC
- Configure Vite for relative paths (`base: './'`)
- Update build output path
- Verify frontend still works in browser dev mode

### TICKET-D03: Electron Project Scaffolding
**Estimate:** 45 min
- Create `desktop/` project with TypeScript + electron-builder
- Main process: spawn API, create main window
- Preload script with contextBridge
- IPC handler for `get-api-base-url`
- Health check polling (wait for API ready)
- Graceful shutdown on quit

### TICKET-D04: Widget Window Integration
**Estimate:** 45 min
- Create widget as separate BrowserWindow in same Electron app
- Reuse widget code from WIDGET.md
- Click-through behavior
- Position persistence via electron-store
- Widget renderer loads from bundled HTML

### TICKET-D05: System Tray
**Estimate:** 30 min
- Tray icon with context menu
- Icon color changes with block type (polls API every 60s)
- Tooltip shows current block + countdown
- Left-click shows main window
- Right-click shows menu

### TICKET-D06: Global Shortcuts + Auto-Launch
**Estimate:** 30 min
- Register `Ctrl+Shift+P` to toggle widget
- Register `Ctrl+Shift+Protocol` to show main window
- `auto-launch` package for start-on-boot
- Toggle in settings UI

### TICKET-D07: Build Pipeline
**Estimate:** 1 hour
- `scripts/build-all.ps1` and `build-all.sh`
- electron-builder config for Windows NSIS installer
- electron-builder config for macOS DMG
- First-run creates data dirs and vault
- Test: install on a fresh Windows machine, verify it works end-to-end
- Test: install on Mac, verify it works end-to-end

### TICKET-D08: First-Run Onboarding (Shippable Prep)
**Estimate:** 1 hour
- Detect first launch (no DB exists)
- Show onboarding wizard:
  - Welcome
  - Choose vault location
  - Import/customize schedule (start with default template)
  - Enable system tray + auto-launch
  - Test notifications
- Mark as "onboarded" in settings
- Next launches skip this

---

## Migration Checklist

Going from your current state to the desktop app:

- [ ] **TICKET-D01** — Backend changes (env vars, health endpoint) — 30 min
- [ ] Test: `dotnet publish` produces working single-file exe — 15 min
- [ ] **TICKET-D02** — Frontend changes (IPC API URL) — 30 min
- [ ] Test: frontend still works in browser — 5 min
- [ ] **TICKET-D03** — Electron scaffolding + main window — 45 min
- [ ] Test: Electron app launches, loads frontend, talks to embedded API — 15 min
- [ ] **TICKET-D04** — Widget integration — 45 min
- [ ] **TICKET-D05** — System tray — 30 min
- [ ] **TICKET-D06** — Shortcuts + auto-launch — 30 min
- [ ] **TICKET-D07** — Build installers — 1 hour
- [ ] Test: install on fresh Windows + Mac — 30 min

**Total: ~6 hours of Claude Code work to go from hosted web app → shippable desktop app.**

---

## Development Workflow

During development, you don't want to rebuild the installer every time. Here's the dev flow:

```bash
# Terminal 1: Run backend with hot reload
cd backend/Protocol.Api
dotnet watch run

# Terminal 2: Run frontend dev server
cd frontend
npm run dev  # localhost:5173

# Terminal 3: Run Electron pointing to dev servers
cd desktop
npm run dev  # Loads frontend from localhost:5173, points API at localhost:5000
```

The Electron main process detects dev mode (`!app.isPackaged`) and:
- Loads frontend from `http://localhost:5173` (Vite dev server)
- Doesn't spawn the API (you run it manually with `dotnet watch`)
- Uses localhost:5000 as API URL

This gives you fast iteration with hot reload on all three layers.

---

## Claude Code Prompts

### To start the migration:
```
Read docs/DESKTOP.md completely. The Protocol app is currently a .NET API + 
React frontend running separately. We're bundling them into a single Electron 
desktop app for Windows and macOS.

Start with TICKET-D01: Backend changes for embedding. Modify the .NET API to 
read PROTOCOL_PORT, PROTOCOL_DATA_DIR, and PROTOCOL_VAULT_DIR environment 
variables. Add the /api/health endpoint. Print PROTOCOL_API_READY:{port} on 
startup. Verify dotnet publish produces a working single-file executable.
```

### For the Electron shell:
```
Implement TICKET-D03: Electron project scaffolding. Read DESKTOP.md for the 
main.ts reference implementation. The Electron main process must spawn the 
.NET API as a child process, wait for it to be ready, then create the main 
window. Use contextBridge for secure IPC. Test end-to-end: Electron launches, 
API starts, frontend loads, everything talks correctly.
```

### For building the installers:
```
Implement TICKET-D07: Build pipeline. Create build-all.ps1 (Windows) and 
build-all.sh (macOS) that build the backend as self-contained single-file, 
build the frontend with Vite, build the Electron app, and package with 
electron-builder. Output Windows NSIS installer and macOS DMG.
```
