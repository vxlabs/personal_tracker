const API_BASE = 'http://localhost:5000/api';

// ── SPA navigation watcher ────────────────────────────────────────────────────
// YouTube Shorts / other SPAs push history state without a real page load.
// We intercept pushState/replaceState and also listen for popstate so we can
// re-evaluate blocking whenever the URL changes.

let lastHref = location.href;

function onNavigate() {
  if (location.href === lastHref) return;
  lastHref = location.href;
  checkAndInjectBanner();
}

// Wrap history methods to catch SPA navigation
const _push    = history.pushState.bind(history);
const _replace = history.replaceState.bind(history);
history.pushState = (...args) => { _push(...args); onNavigate(); };
history.replaceState = (...args) => { _replace(...args); onNavigate(); };
window.addEventListener('popstate', onNavigate);

// Also poll for URL changes caused by frameworks that bypass history methods
setInterval(() => {
  if (location.href !== lastHref) onNavigate();
}, 1000);

// ── Main logic ────────────────────────────────────────────────────────────────

async function checkAndInjectBanner() {
  // Remove any existing banner so it refreshes cleanly on navigation
  document.getElementById('__protocol_banner_host__')?.remove();
  clearBannerInterval();

  let isFocusBlock, blockedDomains, currentBlock;

  try {
    const [nowRes, sitesRes] = await Promise.all([
      fetch(`${API_BASE}/schedule/now`),
      fetch(`${API_BASE}/blocked-sites`),
    ]);
    if (!nowRes.ok || !sitesRes.ok) throw new Error('API error');
    const now   = await nowRes.json();
    const sites = await sitesRes.json();
    isFocusBlock   = now.currentBlock?.isFocusBlock ?? false;
    blockedDomains = sites.filter(s => s.isActive).map(s => s.domain);
    currentBlock   = now.currentBlock ?? null;
  } catch {
    // Fall back to cached state
    const { state } = await browser.storage.local.get('state');
    if (!state?.online) return;
    isFocusBlock   = state.isFocusBlock ?? false;
    blockedDomains = state.blockedDomains ?? [];
    currentBlock   = state.currentBlock ?? null;
  }

  if (!isFocusBlock) return;

  const hostname  = location.hostname.replace(/^www\./, '');
  const isBlocked = blockedDomains.some(
    d => hostname === d || hostname.endsWith('.' + d)
  );
  if (!isBlocked) return;

  browser.runtime.sendMessage({
    type:       'BLOCKED_ATTEMPT',
    site:       hostname,
    blockLabel: currentBlock?.label,
    blockType:  currentBlock?.type,
  }).catch(() => {});

  injectBanner();
}

// ── Banner with live updates ──────────────────────────────────────────────────

let _bannerInterval = null;

function clearBannerInterval() {
  if (_bannerInterval) { clearInterval(_bannerInterval); _bannerInterval = null; }
}

const COLORS = {
  football: '#22c55e', gym: '#f97316', ml: '#06b6d4', content: '#ec4899',
  reading: '#a78bfa', work: '#facc15', rest: '#64748b', off: '#34d399',
  routine: '#7a7a90', deep: '#a855f7',
};

async function fetchScheduleState() {
  try {
    const res = await fetch(`${API_BASE}/schedule/now`);
    if (!res.ok) throw new Error();
    const now = await res.json();
    return {
      block:   now.currentBlock ?? null,
      pct:     Math.min(100, Math.max(0, now.percentComplete ?? 0)),
      min:     Math.round(now.minutesRemaining ?? 0),
    };
  } catch {
    const { state } = await browser.storage.local.get('state');
    return {
      block: state?.currentBlock ?? null,
      pct:   Math.min(100, Math.max(0, state?.percentComplete ?? 0)),
      min:   Math.round(state?.minutesRemaining ?? 0),
    };
  }
}

function updateBannerDisplay(shadow, data) {
  const color = COLORS[data.block?.type] ?? '#a855f7';
  const fill  = shadow.querySelector('.bar-fill');
  const time  = shadow.querySelector('.time');
  const pct   = shadow.querySelector('.pct');
  if (fill)  fill.style.width = `${data.pct}%`;
  if (time)  time.textContent = data.min > 0 ? `${data.min}m left` : 'ending soon';
  if (pct)   pct.textContent  = `${Math.round(data.pct)}%`;
}

async function injectBanner() {
  if (document.getElementById('__protocol_banner_host__')) return;

  const data  = await fetchScheduleState();
  const color = COLORS[data.block?.type] ?? '#a855f7';
  const label = data.block?.label ?? 'Focus Block';

  const host   = document.createElement('div');
  host.id      = '__protocol_banner_host__';
  const shadow = host.attachShadow({ mode: 'closed' });

  // Static template — no dynamic values interpolated into innerHTML.
  // Colors are injected via CSS custom properties on the host element below.
  shadow.innerHTML = `
    <style>
      :host {
        --bc: #a855f7;
        --bc-dim: #a855f744;
        --bc-glow: #a855f71a;
      }
      .banner {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 36px;
        background: #0a0a0f;
        border-bottom: 1px solid var(--bc-dim);
        border-left: 3px solid var(--bc);
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px;
        z-index: 2147483647;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 11px;
        color: #e8e8f0;
        box-shadow: 0 2px 16px var(--bc-glow);
        box-sizing: border-box;
      }
      .dot {
        width: 7px; height: 7px; border-radius: 50%;
        background: var(--bc); box-shadow: 0 0 6px var(--bc);
        flex-shrink: 0;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      .label {
        font-weight: 700; color: var(--bc);
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px;
      }
      .sep    { color: #3a3a4a; flex-shrink: 0; }
      .time   { color: #7a7a90; white-space: nowrap; font-size: 10px; flex-shrink: 0; }
      .spacer { flex: 1; }
      .bar-wrap { width: 80px; height: 2px; background: #2a2a3a; flex-shrink: 0; }
      .bar-fill { height: 100%; width: 0%; background: var(--bc); box-shadow: 0 0 4px var(--bc); transition: width 0.5s ease; }
      .pct      { font-size: 10px; color: #4a4a5a; width: 28px; text-align: right; flex-shrink: 0; }
      .dismiss  {
        background: none; border: none; color: #4a4a5a; cursor: pointer;
        font-size: 13px; line-height: 1; padding: 2px 4px; font-family: inherit;
        flex-shrink: 0; transition: color 0.15s;
      }
      .dismiss:hover { color: #e8e8f0; }
    </style>
    <div class="banner">
      <div class="dot"></div>
      <span class="label"></span>
      <span class="sep">·</span>
      <span class="time"></span>
      <div class="spacer"></div>
      <div class="bar-wrap"><div class="bar-fill"></div></div>
      <span class="pct"></span>
      <button class="dismiss" title="Dismiss">&#x2715;</button>
    </div>
  `;

  // Inject dynamic values via DOM — keeps innerHTML fully static above.
  host.style.setProperty('--bc', color);
  host.style.setProperty('--bc-dim', color + '44');
  host.style.setProperty('--bc-glow', color + '1a');
  shadow.querySelector('.label').textContent = label;
  shadow.querySelector('.time').textContent  = data.min > 0 ? `${data.min}m left` : 'ending soon';
  shadow.querySelector('.bar-fill').style.width = `${data.pct}%`;
  shadow.querySelector('.pct').textContent   = `${Math.round(data.pct)}%`;

  document.body.appendChild(host);

  shadow.querySelector('.dismiss').addEventListener('click', () => {
    host.remove();
    clearBannerInterval();
  });

  // Live updates every 30 seconds
  _bannerInterval = setInterval(async () => {
    if (!document.getElementById('__protocol_banner_host__')) {
      clearBannerInterval();
      return;
    }
    const fresh = await fetchScheduleState();
    updateBannerDisplay(shadow, fresh);
  }, 30_000);
}

function esc(str) {
  return (str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// ── Boot ──────────────────────────────────────────────────────────────────────
checkAndInjectBanner();
