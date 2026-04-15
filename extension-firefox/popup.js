(async () => {
  const API_BASE = 'http://localhost:5000/api';
  const content  = document.getElementById('content');
  const statusDot = document.getElementById('status-dot');

  // Always fetch live data when popup opens so time remaining is accurate
  let state;
  try {
    const [nowRes, sitesRes] = await Promise.all([
      fetch(`${API_BASE}/schedule/now`),
      fetch(`${API_BASE}/blocked-sites`),
    ]);
    if (!nowRes.ok || !sitesRes.ok) throw new Error('API error');
    const now   = await nowRes.json();
    const sites = await sitesRes.json();
    state = {
      currentBlock:     now.currentBlock ?? null,
      nextBlock:        now.nextBlock ?? null,
      minutesRemaining: now.minutesRemaining ?? 0,
      percentComplete:  now.percentComplete ?? 0,
      isFocusBlock:     now.currentBlock?.isFocusBlock ?? false,
      blockedDomains:   sites.filter(s => s.isActive).map(s => s.domain),
      online:           true,
    };
  } catch {
    // Fall back to cached state if API is unreachable
    const cached = await browser.storage.local.get('state');
    state = cached.state ?? null;
  }

  if (!state || !state.online) {
    statusDot.className = 'status-dot';
    content.innerHTML = `
      <div class="offline-banner">Protocol API offline</div>
      <div class="empty-state">Start the backend on<br/>localhost:5000</div>
    `;
    return;
  }

  statusDot.className = `status-dot online${state.isFocusBlock ? ' focus' : ''}`;

  const block = state.currentBlock;
  if (!block) {
    content.innerHTML = `<div class="empty-state">No active block</div>`;
    return;
  }

  const color = getBlockColor(block.type);
  const pct   = Math.min(100, Math.max(0, state.percentComplete ?? 0));
  const min   = Math.round(state.minutesRemaining ?? 0);

  let html = `
    <div class="block-card" style="--block-color: ${color}">
      <div class="block-label-row">
        <div class="block-dot"></div>
        <span class="block-label">${esc(block.label)}</span>
        <span class="block-time">${min > 0 ? `${min}m left` : 'ending'}</span>
      </div>
      <div class="progress-row">
        <div class="progress-bar">
          <div class="progress-fill" style="width: ${pct}%"></div>
        </div>
        <span class="progress-pct">${Math.round(pct)}%</span>
      </div>
    </div>
  `;

  if (state.nextBlock) {
    html += `
      <div class="next-block">
        <span class="next-label">Next</span>
        <span class="next-name">${esc(state.nextBlock.label)}</span>
      </div>
    `;
  }

  html += `
    <div class="shield-row">
      <span class="shield-icon">${state.isFocusBlock ? '🛡️' : '·'}</span>
      <span class="shield-text ${state.isFocusBlock ? 'active' : ''}">
        ${state.isFocusBlock
          ? `Watching ${state.blockedDomains?.length ?? 0} sites`
          : 'Watching inactive'}
      </span>
    </div>
  `;

  content.innerHTML = html;

  function getBlockColor(type) {
    const colors = {
      football: '#22c55e', gym: '#f97316', ml: '#06b6d4', content: '#ec4899',
      reading: '#a78bfa', work: '#facc15', rest: '#64748b', off: '#34d399',
      routine: '#7a7a90', deep: '#a855f7',
    };
    return colors[type] ?? '#a855f7';
  }

  function esc(str) {
    return (str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
})();
