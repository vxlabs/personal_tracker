(async () => {
  const params = new URLSearchParams(location.search);
  const site = params.get('site') ?? '';

  document.getElementById('site-name').textContent = site || '(unknown)';

  // Back button
  document.getElementById('back-btn').addEventListener('click', () => {
    history.back();
  });

  // Load state from storage
  const { state } = await chrome.storage.local.get('state');

  if (!state || !state.online) {
    document.getElementById('offline-notice').style.display = 'block';
  }

  if (state?.currentBlock) {
    const block = state.currentBlock;
    const color = getBlockColor(block.type);
    document.documentElement.style.setProperty('--block-color', color);

    document.getElementById('block-name').textContent = block.label ?? 'Focus';

    const min = Math.round(state.minutesRemaining ?? 0);
    document.getElementById('minutes').textContent = min > 0 ? min : '—';

    const pct = Math.min(100, Math.max(0, state.percentComplete ?? 0));
    document.getElementById('progress-fill').style.width = `${pct}%`;
  }

  // Report this blocked attempt to background (which logs it to API)
  if (state?.currentBlock && site) {
    chrome.runtime.sendMessage({
      type: 'BLOCKED_ATTEMPT',
      site,
      blockLabel: state.currentBlock.label,
      blockType: state.currentBlock.type,
    });
  }

  // Live countdown
  if (state?.minutesRemaining > 0) {
    let secondsLeft = Math.round(state.minutesRemaining * 60);
    const el = document.getElementById('minutes');

    const tick = setInterval(() => {
      secondsLeft--;
      if (secondsLeft <= 0) {
        clearInterval(tick);
        el.textContent = '0';
        return;
      }
      el.textContent = Math.ceil(secondsLeft / 60);
    }, 1000);
  }

  function getBlockColor(type) {
    const colors = {
      football: '#22c55e',
      gym: '#f97316',
      ml: '#06b6d4',
      content: '#ec4899',
      reading: '#a78bfa',
      work: '#facc15',
      rest: '#64748b',
      off: '#34d399',
      routine: '#7a7a90',
      deep: '#a855f7',
    };
    return colors[type] ?? '#a855f7';
  }
})();
