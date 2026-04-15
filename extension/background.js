const API_BASE = 'http://localhost:5000/api';
const POLL_INTERVAL_MINUTES = 1;

// ── Day-schedule cache ────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
let cachedBlocks = [];
let cachedDay    = -1; // 0=Sun … 6=Sat, -1=not loaded

function parseHHMM(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

async function ensureDaySchedule() {
  const today = new Date().getDay();
  if (cachedDay === today && cachedBlocks.length > 0) return true;
  try {
    const res = await fetch(`${API_BASE}/schedule/${DAY_NAMES[today]}`);
    if (!res.ok) return cachedBlocks.length > 0; // keep stale cache on error
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

  // Not in a block — find next upcoming block today
  if (!currentBlock) {
    nextBlock = cachedBlocks.find((b) => parseHHMM(b.startTime) > cur) ?? null;
  }

  const minutesRemaining = currentBlock
    ? Math.max(0, Math.ceil(parseHHMM(currentBlock.endTime) - cur))
    : 0;

  const percentComplete = currentBlock
    ? Math.round(
        (cur - parseHHMM(currentBlock.startTime)) /
        (parseHHMM(currentBlock.endTime) - parseHHMM(currentBlock.startTime)) * 100
      )
    : 0;

  return { currentBlock, nextBlock, minutesRemaining, percentComplete };
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

chrome.runtime.onInstalled.addListener(() => {
  cachedDay = -1; // force fresh schedule fetch on install/update
  chrome.alarms.create('poll', { periodInMinutes: POLL_INTERVAL_MINUTES });
  pollStatus();
});

chrome.runtime.onStartup.addListener(() => {
  cachedDay = -1; // new browser session — may be a new day
  pollStatus();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'poll') pollStatus();
});

// ── Polling ───────────────────────────────────────────────────────────────────

async function pollStatus() {
  try {
    const [scheduleOk, sitesRes] = await Promise.all([
      ensureDaySchedule(),
      fetch(`${API_BASE}/blocked-sites`),
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
    };

    await chrome.storage.local.set({ state });

    updateBadge(state);
    updateIcon(state);
  } catch {
    // API unreachable — mark offline
    await chrome.storage.local.set({
      state: { online: false, isFocusBlock: false, lastUpdated: Date.now() },
    });
    chrome.action.setBadgeText({ text: '' });
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
    chrome.action.setBadgeText({ text: '' });
    return;
  }
  const min  = Math.round(state.minutesRemaining ?? 0);
  const text = min > 99 ? '99+' : min > 0 ? String(min) : '';
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({
    color: getBlockColor(state.currentBlock?.type),
  });
}

function updateIcon(state) {
  const canvas = new OffscreenCanvas(19, 19);
  const ctx    = canvas.getContext('2d');

  const color = state?.currentBlock
    ? getBlockColor(state.currentBlock.type)
    : '#3a3a4a';

  // Background
  ctx.fillStyle = '#0a0a0f';
  ctx.fillRect(0, 0, 19, 19);

  // Outer ring
  ctx.strokeStyle = color;
  ctx.lineWidth   = 2;
  ctx.beginPath();
  ctx.arc(9.5, 9.5, 8, 0, Math.PI * 2);
  ctx.stroke();

  // Fill for focus blocks (solid), outline only for non-focus
  if (state?.isFocusBlock) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 6, 0, Math.PI * 2);
    ctx.fill();

    // Inner dark dot
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 2.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Dim dot for non-focus
    ctx.fillStyle   = color;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(9.5, 9.5, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  const imageData = ctx.getImageData(0, 0, 19, 19);
  chrome.action.setIcon({ imageData });
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
  const imageData = ctx.getImageData(0, 0, 19, 19);
  chrome.action.setIcon({ imageData });
}

// ── Message handling ──────────────────────────────────────────────────────────

chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'BLOCKED_ATTEMPT') {
    logBlockedAttempt(message);
  }
  if (message.type === 'GET_STATE') {
    // handled via chrome.storage in popup/blocked page directly
  }
});

async function logBlockedAttempt({ site, blockLabel, blockType }) {
  try {
    await fetch(`${API_BASE}/focus/blocked-attempt`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        domain:    site,
        blockedAt: new Date().toISOString(),
        blockLabel,
        blockType,
      }),
    });
  } catch {
    // Silently ignore if API is offline
  }
}
