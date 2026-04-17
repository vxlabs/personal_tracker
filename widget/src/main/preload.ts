import { contextBridge, ipcRenderer } from 'electron';
import { DesktopRuntimeConfig, IPC, WidgetState } from '../shared/types';

const protocolDesktop = {
  getRuntimeConfig: () => ipcRenderer.invoke(IPC.GET_RUNTIME_CONFIG) as Promise<DesktopRuntimeConfig>,
  showMainWindow: () => ipcRenderer.invoke(IPC.SHOW_MAIN_WINDOW),
  showWidget: () => ipcRenderer.invoke(IPC.SHOW_WIDGET),
  hideWidget: () => ipcRenderer.invoke(IPC.HIDE_WIDGET),
  toggleWidget: () => ipcRenderer.invoke(IPC.TOGGLE_WIDGET),
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
