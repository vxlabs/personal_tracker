import { app } from 'electron';

export function setAutoLaunchEnabled(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: true,
    });
  } catch {
    // Non-fatal on unsupported platforms/configurations.
  }
}

export function getAutoLaunchEnabled(): boolean {
  try {
    return app.getLoginItemSettings().openAtLogin;
  } catch {
    return false;
  }
}
