import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';
import { safeLog, safeWrite } from './safe-log';
import { getPortFilePath } from './native-messaging';

const READY_PATTERN = /PROTOCOL_API_READY:(\d+)/;
const STARTUP_TIMEOUT_MS = 30_000;
const HEALTH_TIMEOUT_MS = 15_000;
const HEALTH_RETRY_MS = 500;

type ApiProcess = ReturnType<typeof spawn>;

let apiProcess: ApiProcess | null = null;
let apiBaseUrl: string | null = null;
let apiManagedByElectron = false;

function normalizeApiBaseUrl(baseUrl: string): string {
  const trimmed = baseUrl.replace(/\/$/, '');
  return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
}

function getRuntimeFolder(): string {
  if (process.platform === 'win32') {
    return 'win-x64';
  }

  if (process.platform === 'darwin') {
    return process.arch === 'x64' ? 'osx-x64' : 'osx-arm64';
  }

  throw new Error(`Unsupported desktop runtime platform: ${process.platform}`);
}

function getApiBinaryName(): string {
  return process.platform === 'win32' ? 'Protocol.Api.exe' : 'Protocol.Api';
}

function resolveApiBinaryPath(): string {
  const runtimeFolder = getRuntimeFolder();
  const binaryName = getApiBinaryName();

  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'api', runtimeFolder, binaryName);
  }

  return path.join(app.getAppPath(), 'resources', 'api', runtimeFolder, binaryName);
}

async function waitForHealth(apiRootUrl: string): Promise<void> {
  const startedAt = Date.now();

  while (Date.now() - startedAt < HEALTH_TIMEOUT_MS) {
    try {
      const response = await fetch(`${apiRootUrl}/api/health`);
      if (response.ok) {
        return;
      }
    } catch {
      // Retry until timeout.
    }

    await new Promise((resolve) => setTimeout(resolve, HEALTH_RETRY_MS));
  }

  throw new Error('Embedded API did not become healthy in time.');
}

export async function startApiRuntime(): Promise<string> {
  if (apiBaseUrl) {
    return apiBaseUrl;
  }

  const externalApiBaseUrl = process.env.PROTOCOL_API_BASE_URL;
  if (externalApiBaseUrl) {
    apiManagedByElectron = false;
    apiBaseUrl = normalizeApiBaseUrl(externalApiBaseUrl);
    return apiBaseUrl;
  }

  const apiBinaryPath = resolveApiBinaryPath();
  if (!fs.existsSync(apiBinaryPath)) {
    throw new Error(`Embedded API binary not found at ${apiBinaryPath}`);
  }

  const dataDir = path.join(app.getPath('userData'), 'data');
  // Vault lives next to the app, not under Documents — the Documents folder is
  // covered by Windows Defender Controlled Folder Access on many setups, which
  // silently blocks the unsigned Protocol.Api binary from creating files there.
  //   dev:      <repo>/Protocol-Vault          (one level up from widget/)
  //   packaged: <install-dir>/Protocol-Vault   (next to the installed exe)
  const vaultDir = app.isPackaged
    ? path.join(path.dirname(app.getPath('exe')), 'Protocol-Vault')
    : path.join(app.getAppPath(), '..', 'Protocol-Vault');
  fs.mkdirSync(dataDir, { recursive: true });

  // Pre-create the vault directory tree so the .NET VaultInitService finds
  // existing dirs and skips its own Directory.CreateDirectory calls (which fail
  // with FileNotFoundException on some Windows builds / Documents folder quirks).
  // Each call is individually guarded: a locked or slow dir (e.g. watched by
  // Windows Search) must not crash the whole startup sequence.
  for (const subdir of [
    '',              // vault root itself
    'raw',
    'raw/assets',
    'wiki',
    'wiki/entities',
    'wiki/concepts',
    'wiki/topics',
    'wiki/sources',
    'wiki/syntheses',
  ]) {
    const full = subdir ? path.join(vaultDir, subdir) : vaultDir;
    try {
      fs.mkdirSync(full, { recursive: true });
    } catch {
      // Non-fatal: the .NET API will retry and log a warning if a dir is missing.
    }
  }

  apiManagedByElectron = true;

  apiBaseUrl = await new Promise<string>((resolve, reject) => {
    let settled = false;

    const fail = (error: Error) => {
      if (settled) {
        return;
      }

      settled = true;
      apiBaseUrl = null;
      reject(error);
    };

    const child = spawn(apiBinaryPath, [], {
      env: {
        ...process.env,
        ASPNETCORE_ENVIRONMENT: 'Production',
        PROTOCOL_PORT: '0',
        PROTOCOL_DATA_DIR: dataDir,
        PROTOCOL_VAULT_DIR: vaultDir,
        PROTOCOL_DESKTOP_ACTIVITY: process.platform === 'win32' ? '1' : '0',
      },
      stdio: ['ignore', 'pipe', 'pipe'],
      windowsHide: true,
    });
    apiProcess = child;

    const timeout = setTimeout(() => {
      fail(new Error('Timed out waiting for embedded API startup.'));
    }, STARTUP_TIMEOUT_MS);

    child.on('error', (error) => {
      clearTimeout(timeout);
      fail(error instanceof Error ? error : new Error(String(error)));
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (!settled) {
        fail(new Error(`Embedded API exited before startup completed (code ${code ?? 'unknown'}).`));
      }
      apiProcess = null;
    });

    child.stderr?.on('data', (chunk) => {
      safeLog('error', `[Protocol.Api] ${chunk.toString().trim()}`);
    });

    child.stdout?.on('data', async (chunk) => {
      const output = chunk.toString();
      safeWrite(process.stdout, `[Protocol.Api] ${output}`);

      const match = output.match(READY_PATTERN);
      if (!match || settled) {
        return;
      }

      clearTimeout(timeout);
      const apiRootUrl = `http://127.0.0.1:${match[1]}`;

      try {
        await waitForHealth(apiRootUrl);
        const resolvedBaseUrl = normalizeApiBaseUrl(apiRootUrl);
        // Write port file so the NMH handler can answer extension queries.
        const portFile = getPortFilePath();
        fs.mkdirSync(path.dirname(portFile), { recursive: true });
        fs.writeFileSync(
          portFile,
          JSON.stringify({ port: parseInt(match[1], 10), baseUrl: resolvedBaseUrl }, null, 2),
          'utf-8',
        );
        settled = true;
        resolve(resolvedBaseUrl);
      } catch (error) {
        fail(error instanceof Error ? error : new Error(String(error)));
      }
    });
  });

  return apiBaseUrl;
}

export function stopApiRuntime(): void {
  apiBaseUrl = null;

  // Remove port file so extensions know the API is no longer running.
  try {
    fs.unlinkSync(getPortFilePath());
  } catch {
    // File may not exist (e.g. dev mode or API never started).
  }

  if (!apiManagedByElectron) {
    return;
  }

  if (apiProcess && !apiProcess.killed) {
    apiProcess.kill();
  }

  apiProcess = null;
  apiManagedByElectron = false;
}
