# WIDGET.md — Protocol Desktop Widget (Always-On-Top Overlay)

## What It Is

A tiny, frameless, always-on-top Electron window that floats in the corner of your screen showing:
- Current block name + color
- Countdown timer
- Habit completion status (dots)
- Toggle on/off with a global keyboard shortcut

Think of it like a persistent HUD (heads-up display) for your schedule. It's always visible — over your code editor, over your browser, over everything — so you never lose track of what you should be doing.

---

## Why Electron

| Option | Pros | Cons | Verdict |
|--------|------|------|---------|
| **Electron** | Cross-platform (Win + Mac), reuse React, rich UI, always-on-top API, tray icon, global shortcuts | ~80MB install size | ✅ Best fit |
| **.NET WPF/MAUI** | Native Windows, your strength | No macOS support, separate codebase | ❌ Need Mac too |
| **Tauri** | Lightweight (~5MB), Rust backend | Less mature overlay support, learning curve | ⚠️ Future option |
| **Flutter** | Cross-platform | Overkill for a tiny widget | ❌ |

Electron is the right call because you use both Windows and Mac Mini, and the widget is tiny — the 80MB overhead doesn't matter for a desktop tool.

---

## Architecture

```
widget/
├── package.json
├── tsconfig.json
├── electron-builder.json         # Build config for installers
├── src/
│   ├── main/
│   │   ├── main.ts               # Electron main process
│   │   ├── tray.ts               # System tray icon + menu
│   │   ├── shortcuts.ts          # Global keyboard shortcuts
│   │   ├── api-poller.ts         # Polls Protocol API every 30s
│   │   ├── auto-launch.ts        # Start on system boot
│   │   └── window-manager.ts     # Widget window positioning + state
│   ├── renderer/
│   │   ├── index.html
│   │   ├── Widget.tsx            # Main widget component
│   │   ├── CompactView.tsx       # Minimal mode: just block name + timer
│   │   ├── ExpandedView.tsx      # Full mode: block + timer + habits + next up
│   │   ├── FocusAlert.tsx        # Pulsing alert during focus blocks
│   │   ├── styles.css            # Widget styles (dark theme)
│   │   └── api.ts                # IPC bridge to main process
│   └── shared/
│       └── types.ts
├── assets/
│   ├── tray-icon.png             # 16x16 tray icon
│   ├── tray-icon-focus.png       # Red tray icon during focus
│   └── tray-icon-rest.png        # Grey tray icon during rest
└── dist/                         # Build output
```

---

## Widget Modes

### Compact Mode (default)
Small pill-shaped widget, ~200×50px. Shows absolute minimum info.

```
┌──────────────────────────────┐
│  🧠 ML Study         43m ▼  │
│  ████████████░░░░  67%       │
└──────────────────────────────┘
```
- Block type emoji + label
- Countdown timer (minutes remaining)
- Thin progress bar
- Click ▼ to expand
- Draggable to any screen position (remembers position)

### Expanded Mode
Slightly larger, ~240×180px. Shows full context.

```
┌────────────────────────────────┐
│  🧠 ML Study            43m   │
│  ████████████████░░░░░  67%    │
│                                │
│  Habits:  ● ● ● ○ ○ ○  3/6   │
│                                │
│  Next: Content Research        │
│  at 10:30 AM                   │
│                                │
│  [▲ Compact]    [⚙️]   [×]    │
└────────────────────────────────┘
```
- Full block info with countdown
- Habit dots (filled = completed today, colors match habit type)
- Next block preview
- Compact button, settings, close

### Focus Alert Mode
During focus blocks, the widget gets a subtle pulsing border glow in the block's color. If you've been on a blocked site for >30 seconds (detected via the Chrome extension reporting back), the widget flashes red briefly.

---

## Electron Window Configuration

```typescript
// main.ts
const widget = new BrowserWindow({
  width: 240,
  height: 60,                          // Compact mode height
  x: screenWidth - 260,                // Bottom-right corner default
  y: screenHeight - 100,
  frame: false,                         // No title bar
  transparent: true,                    // Transparent background
  alwaysOnTop: true,                    // Always on top of everything
  skipTaskbar: true,                    // Don't show in taskbar
  resizable: false,
  focusable: false,                     // Don't steal focus from other apps
  hasShadow: false,
  webPreferences: {
    preload: path.join(__dirname, 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
  },
});

// Make it click-through when not hovered
// (so it doesn't block clicks on underlying windows)
widget.setIgnoreMouseEvents(true, { forward: true });

// Re-enable mouse events on hover
// (handled via CSS pointer-events and IPC)
```

### Click-Through Behavior
The widget should NOT block clicks on windows underneath. Implementation:
- Default: `setIgnoreMouseEvents(true)` — clicks pass through
- When mouse enters widget area (detected via CSS `:hover`): IPC message to main process → `setIgnoreMouseEvents(false)` — widget becomes interactive
- When mouse leaves: back to click-through mode
- This means the widget is transparent to interaction unless you deliberately hover over it

---

## System Tray

The widget lives in the system tray when "closed" (not actually quit).

**Tray icon:** Small Protocol logo, color changes with block type:
- 🔴 Red during focus blocks
- 🟢 Green during football/gym
- 🟡 Yellow during work
- ⚪ Grey during rest/off

**Tray menu (right-click):**
```
├── Show/Hide Widget         (Ctrl+Shift+P)
├── ─────────────────
├── Current: ML Study (43m remaining)
├── Next: Content Research at 10:30
├── ─────────────────
├── ✓ Start with system
├── ✓ Always on top
├── Compact mode / Expanded mode
├── Position → Top-left | Top-right | Bottom-left | Bottom-right
├── ─────────────────
├── Open Protocol App        (opens browser to localhost:5173)
├── ─────────────────
├── Quit
```

**Tray tooltip (hover):** "ML Study — 43 min remaining"

---

## Global Keyboard Shortcut

`Ctrl+Shift+P` (configurable) — Toggle widget visibility on/off

This is registered as a global shortcut via Electron's `globalShortcut.register()`, so it works even when the widget/electron isn't focused.

```typescript
// shortcuts.ts
import { globalShortcut } from 'electron';

globalShortcut.register('CommandOrControl+Shift+P', () => {
  if (widget.isVisible()) {
    widget.hide();
  } else {
    widget.show();
  }
});
```

---

## API Polling

The widget polls the Protocol API for current state:

```typescript
// api-poller.ts
const API_BASE = 'http://localhost:5000/api';

// Poll every 30 seconds
setInterval(async () => {
  const [schedule, habits] = await Promise.all([
    fetch(`${API_BASE}/schedule/now`).then(r => r.json()),
    fetch(`${API_BASE}/habits/today`).then(r => r.json()),
  ]);
  
  // Send to renderer via IPC
  widget.webContents.send('state-update', { schedule, habits });
}, 30_000);

// Also poll immediately on app start and on wake-from-sleep
```

**Offline/API-down behavior:**
- If API is unreachable, widget shows last known state with a small ⚠️ indicator
- Countdown timer continues locally (doesn't need API for the countdown)
- Reconnects automatically when API comes back

---

## Auto-Launch on Boot

```typescript
// auto-launch.ts
import AutoLaunch from 'auto-launch';

const autoLauncher = new AutoLaunch({
  name: 'Protocol Widget',
  isHidden: true,       // Start minimized to tray
});

// Enable/disable from settings
autoLauncher.enable();
```

The widget starts automatically when you boot your PC/Mac, sitting in the tray. Shows the widget automatically when the first non-rest block starts (e.g., 6:30 AM football).

---

## Widget Styling

```css
/* Dark glassmorphism style — slightly transparent, blurred background */
:root {
  --bg: rgba(10, 10, 15, 0.85);
  --border: rgba(255, 255, 255, 0.08);
  --text: #e8e8f0;
  --text-dim: #7a7a90;
  --radius: 12px;
}

.widget {
  background: var(--bg);
  backdrop-filter: blur(20px);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 10px 14px;
  font-family: 'JetBrains Mono', monospace;
  color: var(--text);
  cursor: default;
  user-select: none;
  
  /* Drag handle */
  -webkit-app-region: drag;
}

.widget.focus-active {
  /* Subtle pulsing glow during focus blocks */
  animation: focus-pulse 3s ease-in-out infinite;
}

@keyframes focus-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(168, 85, 247, 0); }
  50% { box-shadow: 0 0 12px 2px rgba(168, 85, 247, 0.15); }
}

/* Block type border colors */
.widget[data-type="ml"] { border-left: 3px solid #06b6d4; }
.widget[data-type="content"] { border-left: 3px solid #ec4899; }
.widget[data-type="reading"] { border-left: 3px solid #a78bfa; }
.widget[data-type="work"] { border-left: 3px solid #facc15; }
.widget[data-type="football"] { border-left: 3px solid #22c55e; }
.widget[data-type="gym"] { border-left: 3px solid #f97316; }
.widget[data-type="rest"] { border-left: 3px solid #64748b; }
.widget[data-type="off"] { border-left: 3px solid #34d399; }
```

---

## Habit Dots

Six small dots representing today's habits. Filled = done, empty = pending.

```
● ● ● ○ ○ ○  3/6
```

Each dot color matches the habit:
- 🧠 Active recall → cyan
- 📵 IG caged → red
- 🖥️ 1 screen → blue
- 🚶 Lunch walk → green
- 🌙 Sleep → purple
- 📝 Day review → orange

Hovering over a dot shows the habit name in a tiny tooltip. Clicking a dot toggles it (calls the habits API).

---

## Build & Distribution

```json
// electron-builder.json
{
  "appId": "com.protocol.widget",
  "productName": "Protocol Widget",
  "directories": { "output": "release" },
  "win": {
    "target": ["nsis"],
    "icon": "assets/icon.ico"
  },
  "mac": {
    "target": ["dmg"],
    "icon": "assets/icon.icns",
    "category": "public.app-category.productivity"
  },
  "nsis": {
    "oneClick": true,
    "perMachine": false
  }
}
```

Build commands:
```bash
npm run build           # Build renderer + main
npx electron-builder    # Package for current platform
# Or specific:
npx electron-builder --win
npx electron-builder --mac
```

---

## Build Tickets

### TICKET-W01: Widget Scaffolding
**Estimate:** 45 min
- Electron project with TypeScript
- Main process: frameless, transparent, always-on-top BrowserWindow
- Renderer: React + widget shell
- System tray with basic menu
- Global shortcut (Ctrl+Shift+P) to toggle
- Verify: widget floats on top, is draggable, click-through works

### TICKET-W02: API Polling + State Display
**Estimate:** 45 min
- `api-poller.ts` — polls Protocol API every 30 seconds
- IPC bridge to send state to renderer
- `CompactView.tsx` — block name, emoji, countdown timer, progress bar
- Timer counts down locally between polls
- Color-coded border based on block type
- Offline handling (show last known state + warning)

### TICKET-W03: Expanded View + Habits
**Estimate:** 45 min
- `ExpandedView.tsx` — full widget with habits + next block
- Habit dots with colors, tooltips, and click-to-toggle
- Next block preview
- Smooth transition animation between compact/expanded
- Widget height adjusts with animation

### TICKET-W04: Focus Alert + Tray Integration
**Estimate:** 30 min
- Pulsing border glow during focus blocks
- Tray icon color changes with block type
- Tray tooltip shows current block
- Tray menu with full options (position, mode, open app)
- `auto-launch.ts` — start with system option

### TICKET-W05: Polish + Packaging
**Estimate:** 30 min
- Remember window position across restarts (save to electron-store)
- Position presets (4 corners)
- electron-builder config for Win + Mac installers
- App icon set
- Smooth startup: start hidden, show on first non-rest block

---

## Claude Code Prompts

### To start building:
```
Read docs/WIDGET.md completely. This is a standalone Electron app that acts as 
an always-on-top desktop widget for the Protocol app. 

Start with TICKET-W01: Scaffold the Electron project with TypeScript. 
Create a frameless, transparent, always-on-top BrowserWindow (240x60px). 
Add system tray icon with right-click menu. Register Ctrl+Shift+P as a 
global shortcut to toggle visibility. The widget should be draggable 
and click-through when not hovered.
```

### For the compact view:
```
Implement TICKET-W02. The widget polls http://localhost:5000/api/schedule/now 
every 30 seconds and displays: block emoji + name, countdown timer (locally 
counting down between polls), and a thin progress bar. Use the dark glassmorphism 
style from WIDGET.md. Color-code the left border by block type.
```
