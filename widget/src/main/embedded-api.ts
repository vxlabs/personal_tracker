import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { app } from 'electron';

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
  const vaultDir = path.join(app.getPath('documents'), 'Protocol-Vault');
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(vaultDir, { recursive: true });

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
      console.error(`[Protocol.Api] ${chunk.toString().trim()}`);
    });

    child.stdout?.on('data', async (chunk) => {
      const output = chunk.toString();
      process.stdout.write(`[Protocol.Api] ${output}`);

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
        const portFile = path.join(app.getPath('userData'), 'api-port.json');
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
    fs.unlinkSync(path.join(app.getPath('userData'), 'api-port.json'));
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
