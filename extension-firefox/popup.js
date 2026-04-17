(async () => {
  const stored    = await browser.storage.local.get(['apiBase', 'state']);
  const API_BASE  = stored.apiBase ?? 'http://localhost:5000/api';
  const content   = document.getElementById('content');
  const statusDot = document.getElementById('status-dot');

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
    state = stored.state ?? null;
  }

  if (!state || !state.online) {
    statusDot.className = 'status-dot';
    const banner = document.createElement('div');
    banner.className = 'offline-banner';
    banner.textContent = 'Protocol API offline';
    const hint = document.createElement('div');
    hint.className = 'empty-state';
    hint.textContent = 'Start the Protocol desktop app';
    content.append(banner, hint);
    return;
  }

  statusDot.className = `status-dot online${state.isFocusBlock ? ' focus' : ''}`;

  const block = state.currentBlock;
  if (!block) {
    const empty = document.createElement('div');
    empty.className = 'empty-state';
    empty.textContent = 'No active block';
    content.appendChild(empty);
    return;
  }

  const color = getBlockColor(block.type);
  const pct   = Math.min(100, Math.max(0, state.percentComplete ?? 0));
  const min   = Math.round(state.minutesRemaining ?? 0);

  // ── Block card ──────────────────────────────────────────────────────────────
  const card = document.createElement('div');
  card.className = 'block-card';
  card.style.setProperty('--block-color', color);

  const labelRow = document.createElement('div');
  labelRow.className = 'block-label-row';

  const dot = document.createElement('div');
  dot.className = 'block-dot';

  const labelSpan = document.createElement('span');
  labelSpan.className = 'block-label';
  labelSpan.textContent = block.label;

  const timeSpan = document.createElement('span');
  timeSpan.className = 'block-time';
  timeSpan.textContent = min > 0 ? `${min}m left` : 'ending';

  labelRow.append(dot, labelSpan, timeSpan);

  const progressRow = document.createElement('div');
  progressRow.className = 'progress-row';

  const progressBar = document.createElement('div');
  progressBar.className = 'progress-bar';

  const progressFill = document.createElement('div');
  progressFill.className = 'progress-fill';
  progressFill.style.width = `${pct}%`;
  progressBar.appendChild(progressFill);

  const pctSpan = document.createElement('span');
  pctSpan.className = 'progress-pct';
  pctSpan.textContent = `${Math.round(pct)}%`;

  progressRow.append(progressBar, pctSpan);
  card.append(labelRow, progressRow);
  content.appendChild(card);

  // ── Next block ──────────────────────────────────────────────────────────────
  if (state.nextBlock) {
    const nextDiv = document.createElement('div');
    nextDiv.className = 'next-block';

    const nextLabel = document.createElement('span');
    nextLabel.className = 'next-label';
    nextLabel.textContent = 'Next';

    const nextName = document.createElement('span');
    nextName.className = 'next-name';
    nextName.textContent = state.nextBlock.label;

    nextDiv.append(nextLabel, nextName);
    content.appendChild(nextDiv);
  }

  // ── Shield row ──────────────────────────────────────────────────────────────
  const shieldRow = document.createElement('div');
  shieldRow.className = 'shield-row';

  const shieldIcon = document.createElement('span');
  shieldIcon.className = 'shield-icon';
  shieldIcon.textContent = state.isFocusBlock ? '🛡️' : '·';

  const shieldText = document.createElement('span');
  shieldText.className = `shield-text${state.isFocusBlock ? ' active' : ''}`;
  shieldText.textContent = state.isFocusBlock
    ? `Watching ${state.blockedDomains?.length ?? 0} sites`
    : 'Watching inactive';

  shieldRow.append(shieldIcon, shieldText);
  content.appendChild(shieldRow);

  function getBlockColor(type) {
    const colors = {
      football: '#22c55e', gym: '#f97316', ml: '#06b6d4', content: '#ec4899',
      reading: '#a78bfa', work: '#facc15', rest: '#64748b', off: '#34d399',
      routine: '#7a7a90', deep: '#a855f7',
    };
    return colors[type] ?? '#a855f7';
  }
})();
