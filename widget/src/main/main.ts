import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'path';
import { isNativeMessagingHostMode, runNativeMessagingHost, registerNativeMessagingHost } from './native-messaging';
import { installLoggingGuards, safeLog } from './safe-log';

installLoggingGuards();

// Must be the very first check after imports.  When Chrome/Firefox spawns
// Protocol.exe as a native messaging host it passes the extension origin
// (e.g. "chrome-extension://abc.../") as argv[1].  We handle the NMH
// protocol here and exit before any GUI or API initialization happens.
const __nmhMode = isNativeMessagingHostMode();
if (__nmhMode) {
  runNativeMessagingHost(); // async — calls process.exit() once stdin is read
}
import { setupTray, updateTrayPreferences } from './tray';
import { setupShortcuts, unregisterShortcuts } from './shortcuts';
import { WindowManager } from './window-manager';
import { getLastWidgetState, setApiBaseUrl, setWidgetMode, startApiPoller, stopApiPoller, setFirstNonRestBlockCallback } from './api-poller';
import { startApiRuntime, stopApiRuntime } from './embedded-api';
import { DesktopRuntimeConfig, IPC, WidgetCorner, WidgetMode } from '../shared/types';
import { setAutoLaunchEnabled } from './auto-launch';

const WIDGET_WIDTH = 240;
const COMPACT_HEIGHT = 60;
const EXPANDED_HEIGHT = 300;
const MAIN_WINDOW_WIDTH = 1440;
const MAIN_WINDOW_HEIGHT = 920;
const RESIZE_DURATION_MS = 180;
const RESIZE_STEP_MS = 16;
const SCREEN_MARGIN = 20;

// Keep a global reference to prevent GC
export let widget: BrowserWindow | null = null;
export let mainWindow: BrowserWindow | null = null;
export let windowManager: WindowManager | null = null;
let resizeTimer: ReturnType<typeof setInterval> | null = null;
let isQuitting = false;
let runtimeConfig: DesktopRuntimeConfig | null = null;

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

function showMainWindow(): void {
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  }
  mainWindow.show();
  mainWindow.focus();
}

function showWidget(): void {
  widget?.show();
}

function hideWidget(): void {
  widget?.hide();
}

function toggleWidget(): void {
  if (!widget) return;
  widget.isVisible() ? widget.hide() : widget.show();
}

function getFrontendEntryPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'frontend', 'index.html');
  }

  return path.join(app.getAppPath(), 'dist', 'frontend', 'index.html');
}

function getIconPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets', 'icon.png');
  }
  return path.join(app.getAppPath(), 'assets', 'icon.png');
}

function createMainWindow(): BrowserWindow {
  const win = new BrowserWindow({
    width: MAIN_WINDOW_WIDTH,
    height: MAIN_WINDOW_HEIGHT,
    minWidth: 1120,
    minHeight: 720,
    show: false,
    icon: getIconPath(),
    backgroundColor: '#0a0a0f',
    title: 'Protocol',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  });

  void win.loadFile(getFrontendEntryPath());

  win.once('ready-to-show', () => {
    win.show();
  });

  win.on('close', (event) => {
    if (isQuitting) return;
    event.preventDefault();
    win.hide();
  });

  return win;
}

function createWidget(): BrowserWindow {
  const { x: areaX, y: areaY, width: areaWidth, height: areaHeight } = screen.getPrimaryDisplay().workArea;
  const savedPos = windowManager!.getSavedPosition();
  const initialMode = windowManager!.getMode();
  const initialHeight = getHeightForMode(initialMode);
  const isDev = !app.isPackaged;

  // Default position: bottom-right corner above taskbar
  let initX = savedPos?.x ?? areaX + areaWidth - WIDGET_WIDTH - SCREEN_MARGIN;
  let initY = savedPos?.y ?? areaY + areaHeight - initialHeight - SCREEN_MARGIN;

  // Clamp to work area so widget never starts hidden under the taskbar or off-screen
  initX = Math.max(areaX, Math.min(initX, areaX + areaWidth - WIDGET_WIDTH));
  initY = Math.max(areaY, Math.min(initY, areaY + areaHeight - initialHeight));

  const win = new BrowserWindow({
    width: WIDGET_WIDTH,
    height: initialHeight,
    x: initX,
    y: initY,
    frame: false,
    transparent: true,
    alwaysOnTop: windowManager!.getAlwaysOnTop(),
    skipTaskbar: true,
    resizable: false,
    focusable: true,  // must be true for -webkit-app-region: drag to work on Windows
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
  void win.loadFile(path.join(__dirname, '../../renderer/index.html'));

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

app.whenReady()
  .then(async () => {
    // When spawned as an NMH handler, runNativeMessagingHost() is waiting for
    // stdin and will call process.exit().  Don't initialise the full app — no
    // windows, no API spawn, no tray — just let the handler finish and exit.
    if (__nmhMode) return;

    windowManager = new WindowManager();
    runtimeConfig = {
      isDesktop: true,
      apiBaseUrl: await startApiRuntime(),
    };
    setApiBaseUrl(runtimeConfig.apiBaseUrl);

    // Register Protocol as a native messaging host so Chrome/Firefox extensions
    // can query the live API port.  Idempotent — safe to call on every startup.
    registerNativeMessagingHost();

    mainWindow = createMainWindow();
    widget = createWidget();

    setAutoLaunchEnabled(windowManager.getStartOnBoot());
    setWidgetMode(windowManager.getMode());

    setupTray(
      widget,
      {
        onShowMainWindow: () => showMainWindow(),
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
    ipcMain.handle(IPC.GET_RUNTIME_CONFIG, () => runtimeConfig);
    ipcMain.handle(IPC.SHOW_MAIN_WINDOW, () => {
      showMainWindow();
    });
    ipcMain.handle(IPC.SHOW_WIDGET, () => {
      showWidget();
    });
    ipcMain.handle(IPC.HIDE_WIDGET, () => {
      hideWidget();
    });
    ipcMain.handle(IPC.TOGGLE_WIDGET, () => {
      toggleWidget();
    });

    app.on('activate', () => {
      showMainWindow();
    });
  })
  .catch((error) => {
    safeLog('error', 'Failed to start Protocol desktop shell:', error);
    app.quit();
  });

app.on('window-all-closed', () => {
  // Keep the app alive in the tray across platforms.
});

app.on('will-quit', () => {
  isQuitting = true;
  if (resizeTimer) {
    clearInterval(resizeTimer);
    resizeTimer = null;
  }
  unregisterShortcuts();
  stopApiPoller();
  stopApiRuntime();
});

// Prevent the window from being garbage-collected when all windows close
app.on('before-quit', () => {
  mainWindow?.removeAllListeners('close');
  widget?.removeAllListeners('close');
});
