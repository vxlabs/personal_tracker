/**
 * Native Messaging Host (NMH) support.
 *
 * How it works:
 *   1. When Protocol starts (packaged), it writes the NMH manifest JSON and
 *      registers it in the OS-specific location (registry on Windows, file on macOS).
 *   2. When a browser extension calls sendNativeMessage('com.vxlabs.protocol'),
 *      the browser spawns Protocol.exe with the extension origin as argv[1].
 *   3. That lightweight instance reads api-port.json (written by the main
 *      instance when the embedded API comes online) and replies with the live
 *      API base URL, then exits.
 *
 * Chrome extension ID:
 *   Chrome derives the extension ID from the RSA public key in the "key" field
 *   of extension/manifest.json.  That key must be generated once:
 *
 *     npm run generate-extension-key   (see scripts/generate-extension-key.js)
 *
 *   The script prints the key (paste into extension/manifest.json) and the
 *   resulting extension ID.  Set CHROME_EXTENSION_ID below to that ID, then
 *   rebuild.  The ID stays stable as long as the same key is used.
 *
 *   For Chrome Web Store distribution: replace with the store-assigned ID.
 *
 * Firefox extension ID:
 *   Fixed as "protocol-enforcer@protocol.local" in extension-firefox/manifest.json.
 *   No extra steps needed.
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import { execSync } from 'child_process';

export const NMH_NAME = 'com.vxlabs.protocol';
const NMH_DESCRIPTION = 'Protocol — live API port discovery for browser extensions';

// ── Extension IDs ─────────────────────────────────────────────────────────────

/**
 * Firefox extension ID — matches browser_specific_settings.gecko.id in
 * extension-firefox/manifest.json.  Stable out of the box.
 */
const FIREFOX_EXTENSION_ID = 'protocol-enforcer@protocol.local';

/**
 * Chrome extension ID.
 *
 * Replace this placeholder with the ID derived from your extension key:
 *   1. Run:  npm run generate-extension-key
 *   2. Paste the printed key into the "key" field of extension/manifest.json
 *   3. Load the extension as unpacked in Chrome (chrome://extensions)
 *   4. Copy the ID shown there and set it here, then rebuild
 *
 * You can also override at runtime via the PROTOCOL_CHROME_EXT_ID env var
 * (useful for CI or testing with a different build).
 */
const CHROME_EXTENSION_ID =
  process.env.PROTOCOL_CHROME_EXT_ID ??
  'hjkbbdlkaihppafembkpffpoaiegpkdm';

// ── Port file ─────────────────────────────────────────────────────────────────

/**
 * Path to the file the running Electron instance writes when the embedded API
 * comes online.  The NMH handler reads this file to answer the extension query.
 *
 * Computed without app.getPath() so it can be used before Electron is ready
 * (i.e. inside the lightweight NMH handler process).
 */
export function getPortFilePath(): string {
  const appDataDir =
    process.platform === 'win32'
      ? path.join(process.env.APPDATA ?? os.homedir(), 'Protocol')
      : path.join(os.homedir(), 'Library', 'Application Support', 'Protocol');
  return path.join(appDataDir, 'api-port.json');
}

// ── Manifest builders ─────────────────────────────────────────────────────────

function buildChromeManifest(execPath: string): object {
  return {
    name: NMH_NAME,
    description: NMH_DESCRIPTION,
    path: execPath,
    type: 'stdio',
    allowed_origins: [`chrome-extension://${CHROME_EXTENSION_ID}/`],
  };
}

function buildFirefoxManifest(execPath: string): object {
  return {
    name: NMH_NAME,
    description: NMH_DESCRIPTION,
    path: execPath,
    type: 'stdio',
    allowed_extensions: [FIREFOX_EXTENSION_ID],
  };
}

// ── Registration ──────────────────────────────────────────────────────────────

/**
 * Register Protocol as a native messaging host.
 * Called on every startup in packaged mode — idempotent and fast.
 * Skipped in dev mode; extensions fall back to localhost:5000.
 */
export function registerNativeMessagingHost(): void {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { app } = require('electron') as typeof import('electron');

  if (!app.isPackaged) return;

  try {
    const execPath = process.execPath;

    if (process.platform === 'win32') {
      registerWindows(app.getPath('userData'), execPath);
    } else if (process.platform === 'darwin') {
      registerMacos(execPath);
    }

    console.log('[NMH] Native messaging host registered');
  } catch (err) {
    console.error('[NMH] Registration failed:', err);
  }
}

function registerWindows(userData: string, execPath: string): void {
  const chromeManifestPath = path.join(userData, `${NMH_NAME}.json`);
  const ffManifestPath = path.join(userData, `${NMH_NAME}.firefox.json`);

  fs.writeFileSync(
    chromeManifestPath,
    JSON.stringify(buildChromeManifest(execPath), null, 2),
    'utf-8',
  );
  fs.writeFileSync(
    ffManifestPath,
    JSON.stringify(buildFirefoxManifest(execPath), null, 2),
    'utf-8',
  );

  // Chrome and Chromium-based browsers
  setWinRegistryKey(
    `HKCU\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\${NMH_NAME}`,
    chromeManifestPath,
  );
  setWinRegistryKey(
    `HKCU\\SOFTWARE\\Chromium\\NativeMessagingHosts\\${NMH_NAME}`,
    chromeManifestPath,
  );
  setWinRegistryKey(
    `HKCU\\SOFTWARE\\Microsoft\\Edge\\NativeMessagingHosts\\${NMH_NAME}`,
    chromeManifestPath,
  );
  // Firefox
  setWinRegistryKey(
    `HKCU\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\${NMH_NAME}`,
    ffManifestPath,
  );
}

function setWinRegistryKey(keyPath: string, value: string): void {
  try {
    execSync(`reg add "${keyPath}" /ve /t REG_SZ /d "${value}" /f`, { stdio: 'ignore' });
  } catch (err) {
    console.warn(`[NMH] Failed to set registry key ${keyPath}:`, err);
  }
}

function registerMacos(execPath: string): void {
  const home = os.homedir();

  const entries: Array<{ dir: string; manifest: object }> = [
    {
      dir: path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'NativeMessagingHosts'),
      manifest: buildChromeManifest(execPath),
    },
    {
      dir: path.join(home, 'Library', 'Application Support', 'Chromium', 'NativeMessagingHosts'),
      manifest: buildChromeManifest(execPath),
    },
    {
      dir: path.join(home, 'Library', 'Application Support', 'Mozilla', 'NativeMessagingHosts'),
      manifest: buildFirefoxManifest(execPath),
    },
  ];

  for (const { dir, manifest } of entries) {
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(
      path.join(dir, `${NMH_NAME}.json`),
      JSON.stringify(manifest, null, 2),
      'utf-8',
    );
  }
}

// ── NMH runtime handler ───────────────────────────────────────────────────────

/**
 * Returns true when the process was launched by a browser as a native
 * messaging host.  Chrome/Firefox pass the calling extension's origin
 * (e.g. "chrome-extension://abc.../") as argv[1].
 */
export function isNativeMessagingHostMode(): boolean {
  return process.argv.some(
    (arg) =>
      arg.startsWith('chrome-extension://') ||
      arg.startsWith('moz-extension://'),
  );
}

/**
 * Lightweight NMH handler.  Reads the port file written by the running
 * Protocol instance and replies with the live API URL, then exits.
 *
 * Wire format (both directions):
 *   [4 bytes little-endian uint32 = JSON byte length] [UTF-8 JSON body]
 */
export function runNativeMessagingHost(): void {
  let responded = false;

  function respond(): void {
    if (responded) return;
    responded = true;

    let payload: object;
    try {
      const raw = fs.readFileSync(getPortFilePath(), 'utf-8');
      const parsed = JSON.parse(raw) as { port: number; baseUrl: string };
      payload = { status: 'ok', port: parsed.port, baseUrl: parsed.baseUrl };
    } catch {
      payload = { status: 'offline', port: null, baseUrl: null };
    }

    const json = JSON.stringify(payload);
    const byteLen = Buffer.byteLength(json, 'utf-8');
    const header = Buffer.alloc(4);
    header.writeUInt32LE(byteLen, 0);
    process.stdout.write(header);
    process.stdout.write(json, 'utf-8');

    process.exit(0);
  }

  // Read stdin until we have a complete message, then respond.
  const chunks: Buffer[] = [];
  process.stdin.on('data', (chunk: Buffer) => {
    chunks.push(chunk);
    const buf = Buffer.concat(chunks);
    if (buf.length < 4) return;
    const msgLen = buf.readUInt32LE(0);
    if (buf.length >= 4 + msgLen) respond();
  });

  // Respond even if stdin closes without a well-formed message.
  process.stdin.on('end', respond);

  // Safety timeout — exit if browser never sends a message.
  setTimeout(respond, 5_000);
}
