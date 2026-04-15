import { BrowserWindow, Menu, Tray, app, nativeImage, shell } from 'electron';
import { WidgetCorner, WidgetMode } from '../shared/types';

let tray: Tray | null = null;
let trayWidget: BrowserWindow | null = null;
let trayHandlers: TrayHandlers | null = null;

interface TrayHandlers {
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
  tooltip: 'Protocol Widget',
  mode: 'compact',
  alwaysOnTop: true,
  startOnBoot: false,
};

const TRAY_COLORS: Record<string, string> = {
  ml: '#ef4444',
  content: '#ef4444',
  reading: '#ef4444',
  deep: '#ef4444',
  work: '#facc15',
  football: '#22c55e',
  gym: '#22c55e',
  rest: '#94a3b8',
  off: '#94a3b8',
  routine: '#94a3b8',
};

function createTrayIcon(blockType?: string): Electron.NativeImage {
  const color = blockType ? (TRAY_COLORS[blockType] ?? '#94a3b8') : '#64748b';
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
      <rect x="1.5" y="1.5" width="13" height="13" rx="4" fill="rgba(15,18,25,0.96)" stroke="rgba(255,255,255,0.12)" />
      <circle cx="8" cy="8" r="3.25" fill="${color}" />
    </svg>
  `;

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`);
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
      click: () => {
        void shell.openExternal('http://localhost:5173');
      },
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

  tray.on('double-click', () => {
    if (!trayWidget) return;
    trayWidget.isVisible() ? trayWidget.hide() : trayWidget.show();
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
