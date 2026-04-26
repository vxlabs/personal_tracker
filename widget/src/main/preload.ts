import { contextBridge, ipcRenderer } from 'electron';
import { DesktopRuntimeConfig, IPC, WidgetState } from '../shared/types';
import type { UpdateStatus } from './auto-updater';

const protocolDesktop = {
  getRuntimeConfig: () => ipcRenderer.invoke(IPC.GET_RUNTIME_CONFIG) as Promise<DesktopRuntimeConfig>,
  showMainWindow: () => ipcRenderer.invoke(IPC.SHOW_MAIN_WINDOW),
  showWidget: () => ipcRenderer.invoke(IPC.SHOW_WIDGET),
  hideWidget: () => ipcRenderer.invoke(IPC.HIDE_WIDGET),
  toggleWidget: () => ipcRenderer.invoke(IPC.TOGGLE_WIDGET),
  openFolder: (folderPath: string) => ipcRenderer.invoke(IPC.OPEN_FOLDER, folderPath),
  getLogPath: () => ipcRenderer.invoke(IPC.GET_LOG_PATH) as Promise<string | null>,
  openLogFolder: () => ipcRenderer.invoke(IPC.OPEN_LOG_FOLDER),

  // Auto-update
  getUpdateStatus: () => ipcRenderer.invoke(IPC.GET_UPDATE_STATUS) as Promise<UpdateStatus>,
  checkForUpdate: () => ipcRenderer.invoke(IPC.CHECK_FOR_UPDATE) as Promise<void>,
  installUpdate: () => ipcRenderer.invoke(IPC.INSTALL_UPDATE) as Promise<void>,
  onUpdateAvailable: (callback: (payload: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { version: string }) => callback(payload);
    ipcRenderer.on(IPC.UPDATE_AVAILABLE, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_AVAILABLE, listener);
  },
  onUpdateDownloadProgress: (callback: (payload: { percent: number }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { percent: number }) => callback(payload);
    ipcRenderer.on(IPC.UPDATE_DOWNLOAD_PROGRESS, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_DOWNLOAD_PROGRESS, listener);
  },
  onUpdateDownloaded: (callback: (payload: { version: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { version: string }) => callback(payload);
    ipcRenderer.on(IPC.UPDATE_DOWNLOADED, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_DOWNLOADED, listener);
  },
  onUpdateError: (callback: (payload: { message: string }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, payload: { message: string }) => callback(payload);
    ipcRenderer.on(IPC.UPDATE_ERROR, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_ERROR, listener);
  },
  onUpdateStatusChanged: (callback: (status: UpdateStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: UpdateStatus) => callback(status);
    ipcRenderer.on(IPC.UPDATE_STATUS_CHANGED, listener);
    return () => ipcRenderer.removeListener(IPC.UPDATE_STATUS_CHANGED, listener);
  },
};

contextBridge.exposeInMainWorld('protocolWidget', {
  // Renderer → Main
  setIgnoreMouse: (ignore: boolean) => {
    ipcRenderer.send(IPC.SET_IGNORE_MOUSE, ignore);
  },
  setMode: (mode: 'compact' | 'expanded') => {
    ipcRenderer.send(IPC.SET_MODE, mode);
  },
  toggleHabit: (habitId: string) => {
    ipcRenderer.send(IPC.TOGGLE_HABIT, habitId);
  },
  wikiCapture: (url: string) => {
    ipcRenderer.send(IPC.WIKI_CAPTURE, url);
  },
  wikiCompilePending: () => {
    ipcRenderer.send(IPC.WIKI_COMPILE_PENDING);
  },
  dragStart: () => {
    ipcRenderer.send(IPC.DRAG_START);
  },
  dragEnd: () => {
    ipcRenderer.send(IPC.DRAG_END);
  },
  getState: () => ipcRenderer.invoke(IPC.GET_STATE) as Promise<WidgetState>,

  // Main → Renderer
  onStateUpdate: (callback: (state: WidgetState) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, state: WidgetState) => {
      callback(state);
    };
    ipcRenderer.on(IPC.STATE_UPDATE, listener);
    // Return cleanup fn
    return () => ipcRenderer.removeListener(IPC.STATE_UPDATE, listener);
  },
});

contextBridge.exposeInMainWorld('protocolDesktop', protocolDesktop);
