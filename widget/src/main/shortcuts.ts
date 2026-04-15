import { BrowserWindow, globalShortcut } from 'electron';

const TOGGLE_SHORTCUT = 'CommandOrControl+Shift+P';

export function setupShortcuts(widget: BrowserWindow): void {
  globalShortcut.register(TOGGLE_SHORTCUT, () => {
    if (widget.isVisible()) {
      widget.hide();
    } else {
      widget.show();
    }
  });
}

export function unregisterShortcuts(): void {
  globalShortcut.unregisterAll();
}
