# Desktop Widget

The Protocol desktop widget is a small, frameless, always-on-top Electron window that floats in a corner of your screen. It shows the current time block, countdown timer, and habit completion dots — visible over your code editor, browser, or any other window.

---

## Why Electron

The widget uses Electron because:
- Cross-platform (Windows + macOS) from one codebase
- Reuses the same React components and dark theme from the frontend
- Native always-on-top, global keyboard shortcuts, and system tray APIs
- No additional runtimes beyond Node.js

---

## Location

```
widget/
├── package.json
├── tsconfig.json
├── electron-builder.json
├── src/
│   ├── main/
│   │   ├── main.ts              # Electron main process
│   │   ├── tray.ts              # System tray icon + menu
│   │   ├── shortcuts.ts         # Global keyboard shortcuts
│   │   ├── api-poller.ts        # Polls Protocol API every 30 s
│   │   ├── auto-launch.ts       # Register app on system startup
│   │   └── window-manager.ts   # Window position + state persistence
│   └── renderer/
│       ├── index.html
│       ├── Widget.tsx           # Main widget component
│       ├── CompactView.tsx      # Minimal: block name + timer only
│       ├── ExpandedView.tsx     # Full: block + timer + habits + next up
│       ├── FocusAlert.tsx       # Pulsing alert during focus blocks
│       ├── styles.css           # Dark theme widget styles
│       └── api.ts               # IPC bridge to main process
```

---

## Running in Development

```bash
cd widget
npm install
npm run dev
```

This starts Vite for the renderer and Electron in development mode. Changes to the renderer hot-reload. Changes to the main process require a restart.

---

## Building for Production

```bash
npm run build
```

`electron-builder` packages the app for your current OS:

| OS | Output |
|---|---|
| Windows | `.exe` installer in `dist/` |
| macOS | `.dmg` in `dist/` |

The packaged widget starts on system login (if auto-launch is enabled in settings).

---

## Views

### Compact View
Shown by default. Minimal footprint — just the current block name and the countdown timer.

### Expanded View
Toggle with the global shortcut or by clicking the widget. Shows:
- Current block name + type color
- Countdown timer (time remaining)
- Habit completion dots (colored = done, hollow = pending)
- Next block preview

### Focus Alert
During focus blocks, the widget border pulses red as a persistent visual cue.

---

## Keyboard Shortcut

| Shortcut | Action |
|---|---|
| `Ctrl+Shift+P` (Win) / `Cmd+Shift+P` (Mac) | Toggle widget visibility |

The shortcut works globally — it fires even when the widget is hidden or another app is in focus.

---

## System Tray

Right-clicking the system tray icon shows:
- Current block name
- Toggle widget visibility
- Open Protocol web app
- Quit

---

## API Connection

The widget connects to `http://localhost:5000/api` by default. It polls two endpoints every 30 seconds:

- `GET /api/schedule/now` — current and next block, time remaining
- `GET /api/habit` — today's habit completion status

If the backend is unreachable, the widget displays the last known state and shows a disconnected indicator.

---

## Auto-Launch

The widget registers itself to start on system login via `auto-launch.ts`. This can be toggled from the system tray menu.

---

## Changing the API URL

Edit `src/main/api-poller.ts` — line 1:
```ts
const API_BASE = 'https://your-api-domain.com/api';
```

Rebuild with `npm run build` after changing.
