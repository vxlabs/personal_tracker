import fs from 'fs';
import path from 'path';
import os from 'os';

const MAX_LOG_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
const MAX_ROTATED_FILES = 3;

let logFilePath: string | null = null;
let logStream: fs.WriteStream | null = null;
let currentLogBytes = 0;
let initialized = false;

function getLogDir(): string {
  if (process.platform === 'win32') {
    return path.join(process.env.APPDATA ?? os.homedir(), 'Protocol', 'logs');
  }
  return path.join(os.homedir(), 'Library', 'Application Support', 'Protocol', 'logs');
}

function getLogFilePath(): string {
  return path.join(getLogDir(), 'protocol.log');
}

function rotateIfNeeded(): void {
  if (!logFilePath || currentLogBytes < MAX_LOG_SIZE_BYTES) return;

  closeStream();

  for (let i = MAX_ROTATED_FILES - 1; i >= 1; i--) {
    const older = `${logFilePath}.${i}`;
    const newer = i === 1 ? logFilePath : `${logFilePath}.${i - 1}`;
    try {
      if (fs.existsSync(newer)) {
        fs.renameSync(newer, older);
      }
    } catch {
      // Best-effort rotation
    }
  }

  openStream();
}

function openStream(): void {
  if (!logFilePath) return;

  try {
    logStream = fs.createWriteStream(logFilePath, { flags: 'a', encoding: 'utf-8' });
    logStream.on('error', () => {
      logStream = null;
    });

    try {
      const stat = fs.statSync(logFilePath);
      currentLogBytes = stat.size;
    } catch {
      currentLogBytes = 0;
    }
  } catch {
    logStream = null;
    currentLogBytes = 0;
  }
}

function closeStream(): void {
  if (logStream) {
    try {
      logStream.end();
    } catch {
      // Already closed
    }
    logStream = null;
    currentLogBytes = 0;
  }
}

export function initFileLogger(): string {
  if (initialized && logFilePath) return logFilePath;

  const logDir = getLogDir();
  fs.mkdirSync(logDir, { recursive: true });

  logFilePath = getLogFilePath();
  initialized = true;

  openStream();

  // Write a session-start marker
  const separator = `\n${'═'.repeat(80)}\n`;
  const header = `${separator}  Protocol session started at ${new Date().toISOString()}\n  Platform: ${process.platform} ${process.arch} | Node: ${process.version} | Electron: ${process.versions.electron ?? 'N/A'}\n  Packaged: ${!process.argv[0]?.includes('electron') && !process.defaultApp}\n  PID: ${process.pid}\n  Exe: ${process.execPath}\n${separator}\n`;

  writeToFile(header);
  return logFilePath;
}

function writeToFile(text: string): void {
  if (!logStream || logStream.destroyed) return;

  try {
    logStream.write(text);
    currentLogBytes += Buffer.byteLength(text, 'utf-8');
    rotateIfNeeded();
  } catch {
    // File logging must never crash the app
  }
}

function formatArgs(args: unknown[]): string {
  return args
    .map((arg) => {
      if (arg instanceof Error) {
        return `${arg.message}\n${arg.stack ?? ''}`;
      }
      if (typeof arg === 'object' && arg !== null) {
        try {
          return JSON.stringify(arg, null, 2);
        } catch {
          return String(arg);
        }
      }
      return String(arg);
    })
    .join(' ');
}

export function writeLog(level: string, ...args: unknown[]): void {
  if (!initialized) return;

  const timestamp = new Date().toISOString();
  const tag = level.toUpperCase().padEnd(5);
  const message = formatArgs(args);
  const line = `[${timestamp}] ${tag} ${message}\n`;

  writeToFile(line);
}

export function getLogPath(): string | null {
  return logFilePath;
}

export function shutdownFileLogger(): void {
  if (!initialized) return;
  writeLog('INFO', 'Protocol session ending');
  closeStream();
  initialized = false;
}
