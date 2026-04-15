(async () => {
  const { state } = await chrome.storage.local.get('state');
  if (!state?.isFocusBlock) return;

  const hostname = location.hostname.replace(/^www\./, '');
  const isBlocked = state.blockedDomains?.some(
    (d) => hostname === d || hostname.endsWith('.' + d)
  );
  if (!isBlocked) return;

  // Log the visit attempt
  chrome.runtime.sendMessage({
    type: 'BLOCKED_ATTEMPT',
    site: hostname,
    blockLabel: state.currentBlock?.label,
    blockType: state.currentBlock?.type,
  });

  injectBanner(state);
})();

function injectBanner(state) {
  if (document.getElementById('__protocol_banner_host__')) return;

  const block = state.currentBlock;
  const COLORS = {
    football: '#22c55e', gym: '#f97316', ml: '#06b6d4', content: '#ec4899',
    reading: '#a78bfa', work: '#facc15', rest: '#64748b', off: '#34d399',
    routine: '#7a7a90', deep: '#a855f7',
  };
  const color  = COLORS[block?.type] ?? '#a855f7';
  const pct    = Math.min(100, Math.max(0, state.percentComplete ?? 0));
  const min    = Math.round(state.minutesRemaining ?? 0);
  const label  = block?.label ?? 'Focus Block';

  const host = document.createElement('div');
  host.id = '__protocol_banner_host__';
  const shadow = host.attachShadow({ mode: 'closed' });

  shadow.innerHTML = `
    <style>
      .banner {
        position: fixed;
        top: 0; left: 0; right: 0;
        height: 36px;
        background: #0a0a0f;
        border-bottom: 1px solid ${color}44;
        border-left: 3px solid ${color};
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 12px;
        z-index: 2147483647;
        font-family: 'JetBrains Mono', 'Courier New', monospace;
        font-size: 11px;
        color: #e8e8f0;
        box-shadow: 0 2px 16px ${color}1a;
        box-sizing: border-box;
      }
      .dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        background: ${color};
        box-shadow: 0 0 6px ${color};
        flex-shrink: 0;
        animation: pulse 1.5s ease-in-out infinite;
      }
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50%       { opacity: 0.4; }
      }
      .label {
        font-weight: 700;
        color: ${color};
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 180px;
      }
      .sep { color: #3a3a4a; flex-shrink: 0; }
      .time {
        color: #7a7a90;
        white-space: nowrap;
        font-size: 10px;
        flex-shrink: 0;
      }
      .spacer { flex: 1; }
      .bar-wrap {
        width: 80px;
        height: 2px;
        background: #2a2a3a;
        flex-shrink: 0;
      }
      .bar-fill {
        height: 100%;
        width: ${pct}%;
        background: ${color};
        box-shadow: 0 0 4px ${color};
      }
      .pct {
        font-size: 10px;
        color: #4a4a5a;
        width: 28px;
        text-align: right;
        flex-shrink: 0;
      }
      .dismiss {
        background: none;
        border: none;
        color: #4a4a5a;
        cursor: pointer;
        font-size: 13px;
        line-height: 1;
        padding: 2px 4px;
        font-family: inherit;
        flex-shrink: 0;
        transition: color 0.15s;
      }
      .dismiss:hover { color: #e8e8f0; }
    </style>
    <div class="banner">
      <div class="dot"></div>
      <span class="label">${esc(label)}</span>
      <span class="sep">·</span>
      <span class="time">${min > 0 ? min + 'm left' : 'ending soon'}</span>
      <div class="spacer"></div>
      <div class="bar-wrap"><div class="bar-fill"></div></div>
      <span class="pct">${Math.round(pct)}%</span>
      <button class="dismiss" title="Dismiss">✕</button>
    </div>
  `;

  document.body.appendChild(host);

  shadow.querySelector('.dismiss').addEventListener('click', () => host.remove());
}

function esc(str) {
  return (str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
