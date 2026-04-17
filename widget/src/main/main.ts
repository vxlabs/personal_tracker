import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { setupTray, updateTrayPreferences } from './tray';
import { setupShortcuts, unregisterShortcuts } from './shortcuts';
import { WindowManager } from './window-manager';
import { getLastWidgetState, setWidgetMode, startApiPoller, stopApiPoller, setFirstNonRestBlockCallback } from './api-poller';
import { IPC, WidgetCorner, WidgetMode } from '../shared/types';
import { setAutoLaunchEnabled } from './auto-launch';

const WIDGET_WIDTH = 240;
const COMPACT_HEIGHT = 60;
const EXPANDED_HEIGHT = 210;
const RESIZE_DURATION_MS = 180;
const RESIZE_STEP_MS = 16;
const SCREEN_MARGIN = 20;

// Keep a global reference to prevent GC
export let widget: BrowserWindow | null = null;
export let windowManager: WindowManager | null = null;
let resizeTimer: ReturnType<typeof setInterval> | null = null;
let isQuitting = false;

function easeOutCubic(progress: number): number {
  return 1 - Math.pow(1 - progress, 3);
}

function animateWidgetHeight(win: BrowserWindow, targetHeight: number): void {
  if (resizeTimer) {
    clearInterval(resizeTimer);
    resizeTimer = null;
  }

  const [x, startY] = win.getPosition();
  const [width, startHeight] = win.getSize();
  const bottom = startY + startHeight;

  if (startHeight === targetHeight) {
    return;
  }

  const steps = Math.max(1, Math.round(RESIZE_DURATION_MS / RESIZE_STEP_MS));
  let step = 0;

  resizeTimer = setInterval(() => {
    if (win.isDestroyed()) {
      if (resizeTimer) {
        clearInterval(resizeTimer);
        resizeTimer = null;
      }
      return;
    }

    step += 1;
    const progress = Math.min(1, step / steps);
    const easedProgress = easeOutCubic(progress);
    const nextHeight = Math.round(
      startHeight + (targetHeight - startHeight) * easedProgress
    );
    const nextY = bottom - nextHeight;

    win.setBounds({ x, y: nextY, width, height: nextHeight }, false);

    if (progress >= 1) {
      if (resizeTimer) {
        clearInterval(resizeTimer);
        resizeTimer = null;
      }
    }
  }, RESIZE_STEP_MS);
}

function getHeightForMode(mode: WidgetMode): number {
  return mode === 'expanded' ? EXPANDED_HEIGHT : COMPACT_HEIGHT;
}

function applyMode(mode: WidgetMode, animate = true): void {
  if (!widget) return;

  const targetHeight = getHeightForMode(mode);
  if (animate) {
    animateWidgetHeight(widget, targetHeight);
  } else {
    const [x, y] = widget.getPosition();
    widget.setBounds({ x, y, width: WIDGET_WIDTH, height: targetHeight }, false);
  }

  windowManager?.saveMode(mode);
  setWidgetMode(mode);
  updateTrayPreferences({ mode });
}

function applyAlwaysOnTop(alwaysOnTop: boolean): void {
  if (!widget) return;
  widget.setAlwaysOnTop(alwaysOnTop);
  windowManager?.saveAlwaysOnTop(alwaysOnTop);
  updateTrayPreferences({ alwaysOnTop });
}

function moveWidgetToCorner(corner: WidgetCorner): void {
  if (!widget) return;

  const display = screen.getDisplayMatching(widget.getBounds());
  const { x: areaX, y: areaY, width, height } = display.workArea;
  const [, currentHeight] = widget.getSize();

  let targetX = areaX + SCREEN_MARGIN;
  let targetY = areaY + SCREEN_MARGIN;

  if (corner === 'top-right' || corner === 'bottom-right') {
    targetX = areaX + width - WIDGET_WIDTH - SCREEN_MARGIN;
  }

  if (corner === 'bottom-left' || corner === 'bottom-right') {
    targetY = areaY + height - currentHeight - SCREEN_MARGIN;
  }

  widget.setPosition(targetX, targetY, true);
  windowManager?.savePosition({ x: targetX, y: targetY });
}

function createWidget(): BrowserWindow {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;
  const savedPos = windowManager!.getSavedPosition();
  const initialMode = windowManager!.getMode();
  const isDev = !app.isPackaged;

  const win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: getHeightForMode(initialMode),
    x: savedPos?.x ?? screenWidth - 260,
    y: savedPos?.y ?? screenHeight - 100,
    frame: false,
    transparent: true,
    alwaysOnTop: windowManager!.getAlwaysOnTop(),
    skipTaskbar: !isDev,
    resizable: false,
    focusable: isDev,
    hasShadow: false,
    show: false,   // start hidden — auto-shown when first non-rest block is detected
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,   // preload needs require() to load compiled shared/types module
    },
  });

  // Enable click-through in production; keep interactive in dev for easier debugging
  if (!isDev) {
    win.setIgnoreMouseEvents(true, { forward: true });
  }

  // __dirname is dist/main/main/ — renderer is dist/renderer/
  win.loadFile(path.join(__dirname, '../../renderer/index.html'));

  // Save position on move
  win.on('moved', () => {
    const [x, y] = win.getPosition();
    windowManager!.savePosition({ x, y });
  });

  win.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    win.hide();
  });

  return win;
}

app.whenReady().then(() => {
  windowManager = new WindowManager();
  widget = createWidget();

  setAutoLaunchEnabled(windowManager.getStartOnBoot());
  setWidgetMode(windowManager.getMode());

  setupTray(
    widget,
    {
      onSetMode: (mode) => applyMode(mode),
      onSetAlwaysOnTop: (enabled) => applyAlwaysOnTop(enabled),
      onSetStartOnBoot: (enabled) => {
        setAutoLaunchEnabled(enabled);
        windowManager?.saveStartOnBoot(enabled);
        updateTrayPreferences({ startOnBoot: enabled });
      },
      onMoveToCorner: (corner) => moveWidgetToCorner(corner),
    },
    {
      mode: windowManager.getMode(),
      alwaysOnTop: windowManager.getAlwaysOnTop(),
      startOnBoot: windowManager.getStartOnBoot(),
    }
  );
  setupShortcuts(widget);

  // Auto-show the widget when the first non-rest block is detected after startup.
  // If we're already in a non-rest block the callback fires on the first poll.
  setFirstNonRestBlockCallback(() => {
    widget?.show();
  });

  const bootPoller = () => {
    if (widget) {
      startApiPoller(widget);
    }
  };

  // `loadFile()` is called inside createWidget(), so this may already be loaded.
  if (widget.webContents.isLoadingMainFrame()) {
    widget.webContents.once('did-finish-load', bootPoller);
  } else {
    bootPoller();
  }

  // IPC: renderer tells main to enable/disable mouse pass-through
  ipcMain.on(IPC.SET_IGNORE_MOUSE, (_event, ignore: boolean) => {
    widget?.setIgnoreMouseEvents(ignore, { forward: true });
  });

  // IPC: resize window when mode toggles between compact and expanded
  ipcMain.on(IPC.SET_MODE, (_event, mode: WidgetMode) => {
    applyMode(mode);
  });

  ipcMain.handle(IPC.GET_STATE, () => getLastWidgetState());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      widget = createWidget();
      applyAlwaysOnTop(windowManager!.getAlwaysOnTop());
      applyMode(windowManager!.getMode(), false);
      if (widget.webContents.isLoadingMainFrame()) {
        widget.webContents.once('did-finish-load', () => {
          if (widget) {
            startApiPoller(widget);
          }
        });
      } else {
        startApiPoller(widget);
      }
    }
  });
});

app.on('window-all-closed', () => {
  // On macOS keep the app running in the tray
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('will-quit', () => {
  isQuitting = true;
  if (resizeTimer) {
    clearInterval(resizeTimer);
    resizeTimer = null;
  }
  unregisterShortcuts();
  stopApiPoller();
});

// Prevent the window from being garbage-collected when all windows close
app.on('before-quit', () => {
  widget?.removeAllListeners('close');
});
