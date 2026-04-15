import path from 'path';
import fs from 'fs';
import { WidgetMode, WindowPosition } from '../shared/types';

const CONFIG_DIR = path.join(
  process.env.APPDATA ?? process.env.HOME ?? '.',
  'protocol-widget'
);
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

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
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
        return JSON.parse(raw) as Config;
      }
    } catch {
      // Corrupt config — start fresh
    }
    return {};
  }

  private persist(): void {
    try {
      fs.mkdirSync(CONFIG_DIR, { recursive: true });
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2));
    } catch {
      // Non-fatal — position just won't persist
    }
  }
}
