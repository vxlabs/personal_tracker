import { BrowserWindow, Menu, Tray, app, nativeImage } from 'electron';
import path from 'path';
import { WidgetCorner, WidgetMode } from '../shared/types';

let tray: Tray | null = null;
let trayWidget: BrowserWindow | null = null;
let trayHandlers: TrayHandlers | null = null;

interface TrayHandlers {
  onShowMainWindow: () => void;
  onSetMode: (mode: WidgetMode) => void;
  onSetAlwaysOnTop: (enabled: boolean) => void;
  onSetStartOnBoot: (enabled: boolean) => void;
  onMoveToCorner: (corner: WidgetCorner) => void;
}

interface TrayState {
  currentLabel?: string;
  timeRemaining?: string;
  nextLabel?: string;
  nextTime?: string;
  tooltip: string;
  blockType?: string;
  mode: WidgetMode;
  alwaysOnTop: boolean;
  startOnBoot: boolean;
}

const trayState: TrayState = {
  tooltip: 'Protocol',
  mode: 'compact',
  alwaysOnTop: true,
  startOnBoot: false,
};

const FOCUS_BLOCK_TYPES = new Set(['ml', 'content', 'reading', 'deep', 'work', 'football', 'gym']);
const REST_BLOCK_TYPES = new Set(['rest', 'off', 'routine']);

function getAssetsPath(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'assets');
  }
  return path.join(app.getAppPath(), 'assets');
}

function createTrayIcon(blockType?: string): Electron.NativeImage {
  const assetsPath = getAssetsPath();
  let iconFile = 'tray-icon.png';

  if (blockType) {
    if (FOCUS_BLOCK_TYPES.has(blockType)) {
      iconFile = 'tray-icon-focus.png';
    } else if (REST_BLOCK_TYPES.has(blockType)) {
      iconFile = 'tray-icon-rest.png';
    }
  }

  const img = nativeImage.createFromPath(path.join(assetsPath, iconFile));
  // Resize to standard tray icon size (16x16 on Windows)
  return img.isEmpty() ? nativeImage.createEmpty() : img.resize({ width: 16, height: 16 });
}

function rebuildTrayMenu(): void {
  if (!tray || !trayWidget || !trayHandlers) return;

  const currentInfo = trayState.currentLabel
    ? `Current: ${trayState.currentLabel}${trayState.timeRemaining ? ` (${trayState.timeRemaining} remaining)` : ''}`
    : 'Current: No active block';

  const nextInfo = trayState.nextLabel
    ? `Next: ${trayState.nextLabel}${trayState.nextTime ? ` at ${trayState.nextTime}` : ''}`
    : 'Next: Nothing scheduled';

  const contextMenu = Menu.buildFromTemplate([
    {
      label: trayWidget.isVisible() ? 'Hide Widget' : 'Show Widget',
      accelerator: 'CommandOrControl+Shift+P',
      click: () => {
        if (!trayWidget) return;
        trayWidget.isVisible() ? trayWidget.hide() : trayWidget.show();
      },
    },
    { type: 'separator' },
    { label: currentInfo, enabled: false },
    { label: nextInfo, enabled: false },
    { type: 'separator' },
    {
      label: 'Start with system',
      type: 'checkbox',
      checked: trayState.startOnBoot,
      click: (item) => trayHandlers?.onSetStartOnBoot(item.checked),
    },
    {
      label: 'Always on top',
      type: 'checkbox',
      checked: trayState.alwaysOnTop,
      click: (item) => trayHandlers?.onSetAlwaysOnTop(item.checked),
    },
    {
      label: 'Mode',
      submenu: [
        {
          label: 'Compact',
          type: 'radio',
          checked: trayState.mode === 'compact',
          click: () => trayHandlers?.onSetMode('compact'),
        },
        {
          label: 'Expanded',
          type: 'radio',
          checked: trayState.mode === 'expanded',
          click: () => trayHandlers?.onSetMode('expanded'),
        },
      ],
    },
    {
      label: 'Position',
      submenu: [
        {
          label: 'Top-left',
          click: () => trayHandlers?.onMoveToCorner('top-left'),
        },
        {
          label: 'Top-right',
          click: () => trayHandlers?.onMoveToCorner('top-right'),
        },
        {
          label: 'Bottom-left',
          click: () => trayHandlers?.onMoveToCorner('bottom-left'),
        },
        {
          label: 'Bottom-right',
          click: () => trayHandlers?.onMoveToCorner('bottom-right'),
        },
      ],
    },
    { type: 'separator' },
    {
      label: 'Open Protocol App',
      click: () => trayHandlers?.onShowMainWindow(),
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.setToolTip(trayState.tooltip);
}

export function setupTray(
  widget: BrowserWindow,
  handlers: TrayHandlers,
  initialPreferences: Pick<TrayState, 'mode' | 'alwaysOnTop' | 'startOnBoot'>
): void {
  trayWidget = widget;
  trayHandlers = handlers;
  trayState.mode = initialPreferences.mode;
  trayState.alwaysOnTop = initialPreferences.alwaysOnTop;
  trayState.startOnBoot = initialPreferences.startOnBoot;

  tray = new Tray(createTrayIcon());
  rebuildTrayMenu();

  tray.on('click', () => {
    trayHandlers?.onShowMainWindow();
  });
}

export function updateTrayStatus(status: {
  currentLabel?: string;
  timeRemaining?: string;
  nextLabel?: string;
  nextTime?: string;
  blockType?: string;
  tooltip?: string;
}): void {
  trayState.currentLabel = status.currentLabel;
  trayState.timeRemaining = status.timeRemaining;
  trayState.nextLabel = status.nextLabel;
  trayState.nextTime = status.nextTime;
  trayState.blockType = status.blockType;
  trayState.tooltip = status.tooltip ?? trayState.tooltip;

  if (tray) {
    tray.setImage(createTrayIcon(trayState.blockType));
  }
  rebuildTrayMenu();
}

export function updateTrayPreferences(preferences: Partial<Pick<TrayState, 'mode' | 'alwaysOnTop' | 'startOnBoot'>>): void {
  if (preferences.mode) trayState.mode = preferences.mode;
  if (typeof preferences.alwaysOnTop === 'boolean') trayState.alwaysOnTop = preferences.alwaysOnTop;
  if (typeof preferences.startOnBoot === 'boolean') trayState.startOnBoot = preferences.startOnBoot;
  rebuildTrayMenu();
}
