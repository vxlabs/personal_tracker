/**
 * Protocol Enforcer — Firefox background script (MV2, WebExtensions API)
 *
 * Port discovery:
 *   In desktop (packaged) mode, the Protocol Electron app registers itself as
 *   a native messaging host under the ID "com.vxlabs.protocol".  We query it
 *   to get the dynamic API port and persist the result in browser.storage.local
 *   so it survives background script restarts.
 *
 *   In dev/browser-only mode the query fails silently and we fall back to
 *   http://localhost:5000/api.
 */

const NMH_NAME        = 'com.vxlabs.protocol';
const DEV_API_BASE    = 'http://localhost:5000/api';
const POLL_INTERVAL_MINUTES = 1;
const REDISCOVER_AFTER_FAILURES = 3;

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let cachedBlocks = [];
let cachedDay    = -1;
let apiBase      = DEV_API_BASE;
let pollFailures = 0;

// ── Port discovery via native messaging ───────────────────────────────────────

async function discoverApiPort() {
  try {
    // browser.runtime.sendNativeMessage returns a Promise in Firefox
    const response = await browser.runtime.sendNativeMessage(NMH_NAME, { type: 'get-port' });
    if (response?.status === 'ok' && response?.baseUrl) {
      apiBase = response.baseUrl;
      await browser.storage.local.set({ apiBase });
      return true;
    }
    return false;
  } catch {
    // NMH not registered (dev mode) or Protocol not running
    return false;
  }
}

async function loadStoredApiBase() {
  const result = await browser.storage.local.get('apiBase');
  if (result.apiBase) apiBase = result.apiBase;
}

// ── Schedule helpers ──────────────────────────────────────────────────────────

function parseHHMM(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function ensureDaySchedule() {
  const today = new Date().getDay();
  if (cachedDay === today && cachedBlocks.length > 0) return true;
  try {
    const res = await fetch(`${apiBase}/schedule/${DAY_NAMES[today]}`);
    if (!res.ok) return cachedBlocks.length > 0;
    cachedBlocks = await res.json();
    cachedDay    = today;
    return true;
  } catch {
    return cachedBlocks.length > 0;
  }
}

function computeCurrentState() {
  const now = new Date();
  const cur = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  let currentBlock = null;
  let nextBlock    = null;

  for (let i = 0; i < cachedBlocks.length; i++) {
    const s = parseHHMM(cachedBlocks[i].startTime);
    const e = parseHHMM(cachedBlocks[i].endTime);
    if (cur >= s && cur < e) {
      currentBlock = cachedBlocks[i];
      nextBlock    = cachedBlocks[i + 1] ?? null;
      break;
    }
  }

  if (!currentBlock) {
    nextBlock = cachedBlocks.find((b) => parseHHMM(b.startTime) > cur) ?? null;
  }

  const minutesRemaining = currentBlock
    ? Math.max(0, Math.ceil(parseHHMM(currentBlock.endTime) - cur))
    : 0;

  const percentComplete = currentBlock
    ? Math.round(
        (cur - parseHHMM(currentBlock.startTime)) /
        (parseHHMM(currentBlock.endTime) - parseHHMM(currentBlock.startTime)) * 100,
      )
    : 0;

  return { currentBlock, nextBlock, minutesRemaining, percentComplete };
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

browser.runtime.onInstalled.addListener(() => {
  cachedDay = -1;
  browser.alarms.create('poll', { periodInMinutes: POLL_INTERVAL_MINUTES });
  initAndPoll();
});

browser.runtime.onStartup.addListener(() => {
  cachedDay = -1;
  initAndPoll();
});

browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll') pollStatus();
});

async function initAndPoll() {
  await loadStoredApiBase();
  await discoverApiPort();
  pollStatus();
}

// ── Polling ───────────────────────────────────────────────────────────────────

async function pollStatus() {
  try {
    const [scheduleOk, sitesRes] = await Promise.all([
      ensureDaySchedule(),
      fetch(`${apiBase}/blocked-sites`),
    ]);

    if (!scheduleOk || !sitesRes.ok) throw new Error('API error');

    const sites = await sitesRes.json();
    const { currentBlock, nextBlock, minutesRemaining, percentComplete } = computeCurrentState();

    const isFocusBlock  = currentBlock?.isFocusBlock ?? false;
    const activeDomains = sites.filter((s) => s.isActive).map((s) => s.domain);

    const state = {
      currentBlock:     currentBlock ?? null,
      nextBlock:        nextBlock ?? null,
      minutesRemaining,
      percentComplete,
      isFocusBlock,
      blockedDomains:   activeDomains,
      lastUpdated:      Date.now(),
      online:           true,
      apiBase,
    };

    await browser.storage.local.set({ state });
    pollFailures = 0;

    updateBadge(state);
    updateIcon(state);
  } catch {
    pollFailures += 1;

    if (pollFailures >= REDISCOVER_AFTER_FAILURES) {
      pollFailures = 0;
      cachedDay    = -1;
      await discoverApiPort();
    }

    await browser.storage.local.set({
      state: { online: false, isFocusBlock: false, lastUpdated: Date.now(), apiBase },
    });
    browser.browserAction.setBadgeText({ text: '' });
    setDefaultIcon();
  }
}

// ── Badge & Icon ──────────────────────────────────────────────────────────────

const BLOCK_COLORS = {
  football: '#22c55e',
  gym:      '#f97316',
  ml:       '#06b6d4',
  content:  '#ec4899',
  reading:  '#a78bfa',
  work:     '#facc15',
  rest:     '#64748b',
  off:      '#34d399',
  routine:  '#7a7a90',
  deep:     '#a855f7',
};

function getBlockColor(type) {
  return BLOCK_COLORS[type] ?? '#a855f7';
}

function updateBadge(state) {
  if (!state.isFocusBlock) {
    browser.browserAction.setBadgeText({ text: '' });
    return;
  }
  const min  = Math.round(state.minutesRemaining ?? 0);
  const text = min > 99 ? '99+' : min > 0 ? String(min) : '';
  browser.browserAction.setBadgeText({ text });
  browser.browserAction.setBadgeBackgroundColor({ color: getBlockColor(state.currentBlock?.type) });
}

function updateIcon(state) {
  const canvas = new OffscreenCanvas(19, 19);
  const ctx    = canvas.getContext('2d');
  const color  = state?.currentBlock ? getBlockColor(state.currentBlock.type) : '#3a3a4a';

  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, 19, 19);

  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(9.5, 9.5, 8, 0, Math.PI * 2);
  ctx.stroke();

  if (state?.isFocusBlock) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 6, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle   = color;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  browser.browserAction.setIcon({ imageData: ctx.getImageData(0, 0, 19, 19) });
}

function setDefaultIcon() {
  const canvas = new OffscreenCanvas(19, 19);
  const ctx    = canvas.getContext('2d');
  ctx.fillStyle   = '#0a0a0f';
  ctx.fillRect(0, 0, 19, 19);
  ctx.strokeStyle = '#3a3a4a';
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(9.5, 9.5, 8, 0, Math.PI * 2);
  ctx.stroke();
  browser.browserAction.setIcon({ imageData: ctx.getImageData(0, 0, 19, 19) });
}

// ── Message handling ──────────────────────────────────────────────────────────

browser.runtime.onMessage.addListener((message) => {
  if (message.type === 'BLOCKED_ATTEMPT') logBlockedAttempt(message);
});

async function logBlockedAttempt({ site, blockLabel, blockType }) {
  try {
    await fetch(`${apiBase}/focus/blocked-attempt`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        domain:    site,
        blockedAt: new Date().toISOString(),
        blockLabel,
        blockType,
      }),
    });
  } catch { /* silently ignore if API is offline */ }
}
