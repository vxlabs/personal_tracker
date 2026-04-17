import path from 'path';
import fs from 'fs';
import { app } from 'electron';
import { WidgetMode, WindowPosition } from '../shared/types';

interface Config {
  position?: WindowPosition;
  mode?: WidgetMode;
  alwaysOnTop?: boolean;
  startOnBoot?: boolean;
}

export class WindowManager {
  private config: Config;

  constructor() {
    this.config = this.load();
  }

  getSavedPosition(): WindowPosition | undefined {
    return this.config.position;
  }

  savePosition(pos: WindowPosition): void {
    this.config.position = pos;
    this.persist();
  }

  getMode(): WidgetMode {
    return this.config.mode ?? 'compact';
  }

  saveMode(mode: WidgetMode): void {
    this.config.mode = mode;
    this.persist();
  }

  getAlwaysOnTop(): boolean {
    return this.config.alwaysOnTop ?? true;
  }

  saveAlwaysOnTop(alwaysOnTop: boolean): void {
    this.config.alwaysOnTop = alwaysOnTop;
    this.persist();
  }

  getStartOnBoot(): boolean {
    return this.config.startOnBoot ?? false;
  }

  saveStartOnBoot(startOnBoot: boolean): void {
    this.config.startOnBoot = startOnBoot;
    this.persist();
  }

  private load(): Config {
    const configFile = path.join(app.getPath('userData'), 'config.json');
    try {
      if (fs.existsSync(configFile)) {
        const raw = fs.readFileSync(configFile, 'utf-8');
        return JSON.parse(raw) as Config;
      }
    } catch {
      // Corrupt config — start fresh
    }
    return {};
  }

  private persist(): void {
    const configDir = app.getPath('userData');
    const configFile = path.join(configDir, 'config.json');
    try {
      fs.mkdirSync(configDir, { recursive: true });
      fs.writeFileSync(configFile, JSON.stringify(this.config, null, 2));
    } catch {
      // Non-fatal — position just won't persist
    }
  }
}
