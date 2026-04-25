import { autoUpdater, UpdateInfo } from 'electron-updater';
import { dialog, app, BrowserWindow, ipcMain } from 'electron';
import { safeLog } from './safe-log';
import { IPC } from '../shared/types';

// Delay before the first update check so we don't race with app startup.
const INITIAL_CHECK_DELAY_MS = 10_000;

let updateAvailableInfo: UpdateInfo | null = null;
let updateDownloaded = false;
let checkInProgress = false;

function configureAutoUpdater(): void {
  // Wire electron-updater logging into our existing safeLog system.
  autoUpdater.logger = {
    info:  (...args: unknown[]) => safeLog('info',  '[Updater]', ...args),
    warn:  (...args: unknown[]) => safeLog('warn',  '[Updater]', ...args),
    error: (...args: unknown[]) => safeLog('error', '[Updater]', ...args),
    debug: (...args: unknown[]) => safeLog('info',  '[Updater][debug]', ...args),
  } as unknown as typeof autoUpdater.logger;

  // Download silently in the background; we prompt the user after it finishes.
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    checkInProgress = true;
    safeLog('info', '[Updater] Checking for update…');
    broadcastStatus();
  });

  autoUpdater.on('update-available', (info: UpdateInfo) => {
    checkInProgress = false;
    updateAvailableInfo = info;
    safeLog('info', `[Updater] Update available: ${info.version}`);
    broadcastToAllWindows(IPC.UPDATE_AVAILABLE, { version: info.version });
    broadcastStatus();
  });

  autoUpdater.on('update-not-available', () => {
    checkInProgress = false;
    safeLog('info', '[Updater] Already up to date.');
    broadcastStatus();
  });

  autoUpdater.on('download-progress', (progress) => {
    safeLog('info', `[Updater] Download progress: ${Math.round(progress.percent)}%`);
    broadcastToAllWindows(IPC.UPDATE_DOWNLOAD_PROGRESS, { percent: progress.percent });
  });

  autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
    updateDownloaded = true;
    safeLog('info', `[Updater] Update downloaded: ${info.version}`);
    broadcastToAllWindows(IPC.UPDATE_DOWNLOADED, { version: info.version });
    broadcastStatus();
    promptUserToRestart(info.version);
  });

  autoUpdater.on('error', (err: Error) => {
    checkInProgress = false;
    safeLog('error', '[Updater] Error:', err.message);
    broadcastToAllWindows(IPC.UPDATE_ERROR, { message: err.message });
    broadcastStatus();
  });
}

function broadcastToAllWindows(channel: string, payload?: unknown): void {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, payload);
    }
  });
}

function broadcastStatus(): void {
  const status = getUpdateStatus();
  broadcastToAllWindows(IPC.UPDATE_STATUS_CHANGED, status);
}

export interface UpdateStatus {
  checking: boolean;
  updateAvailable: boolean;
  updateDownloaded: boolean;
  version: string | null;
  currentVersion: string;
}

export function getUpdateStatus(): UpdateStatus {
  return {
    checking: checkInProgress,
    updateAvailable: updateAvailableInfo !== null,
    updateDownloaded,
    version: updateAvailableInfo?.version ?? null,
    currentVersion: app.getVersion(),
  };
}

function promptUserToRestart(newVersion: string): void {
  // Show a native dialog so the user can decide without being interrupted.
  dialog.showMessageBox({
    type: 'info',
    title: 'Update Ready',
    message: `Protocol ${newVersion} has been downloaded.`,
    detail: 'Restart now to apply the update, or continue and it will be installed the next time you quit.',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
  }).then(({ response }) => {
    if (response === 0) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  }).catch((err: Error) => {
    safeLog('error', '[Updater] Restart dialog error:', err.message);
  });
}

export function registerUpdateIpcHandlers(): void {
  // Renderer can ask for current update status at any time.
  ipcMain.handle(IPC.GET_UPDATE_STATUS, () => getUpdateStatus());

  // Renderer can trigger a manual check (e.g. from a Settings page button).
  ipcMain.handle(IPC.CHECK_FOR_UPDATE, async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch (err) {
      safeLog('error', '[Updater] Manual check failed:', (err as Error).message);
    }
  });

  // Renderer can trigger an immediate install when an update is ready.
  ipcMain.handle(IPC.INSTALL_UPDATE, () => {
    if (updateDownloaded) {
      setImmediate(() => autoUpdater.quitAndInstall());
    }
  });
}

export function initAutoUpdater(): void {
  // Only run in production builds; in dev the updater can't find a release feed.
  if (!app.isPackaged) {
    safeLog('info', '[Updater] Skipping auto-update check in development mode.');
    return;
  }

  configureAutoUpdater();
  registerUpdateIpcHandlers();

  // Delay the first check so it doesn't compete with app startup.
  setTimeout(() => {
    safeLog('info', '[Updater] Running initial update check.');
    autoUpdater.checkForUpdates().catch((err: Error) => {
      safeLog('error', '[Updater] Initial check failed:', err.message);
    });
  }, INITIAL_CHECK_DELAY_MS);
}
