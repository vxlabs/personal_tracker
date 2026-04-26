import React, { useCallback, useEffect, useRef, useState } from 'react';
import { WidgetState, WidgetMode } from '../shared/types';
import { getBridge } from './api';
import { CompactView } from './CompactView';
import { ExpandedView } from './ExpandedView';

const BLOCK_COLORS: Record<string, string> = {
  ml: '#06b6d4',
  content: '#ec4899',
  reading: '#a78bfa',
  work: '#facc15',
  football: '#22c55e',
  gym: '#f97316',
  rest: '#64748b',
  off: '#34d399',
  routine: '#94a3b8',
  deep: '#818cf8',
};

const EMPTY_STATE: WidgetState = {
  schedule: null,
  habits: [],
  lastUpdated: 0,
  apiOnline: false,
  mode: 'compact',
  blockedAttemptFlashUntil: null,
  wikiPendingCount: 0,
  wikiAgent: null,
  wikiCompiling: false,
};

export function Widget() {
  const [state, setState] = useState<WidgetState>(EMPTY_STATE);
  const [now, setNow] = useState(Date.now());

  // Subscribe to state updates from the main process
  useEffect(() => {
    // Retry getting the bridge in case the preload hasn't finished exposing it yet
    let bridge = getBridge();
    let bridgeRetries = 0;
    const MAX_BRIDGE_RETRIES = 10;

    let cancelled = false;
    let snapshotTimer: ReturnType<typeof setInterval> | null = null;
    let unsub: (() => void) | null = null;

    const pull = () => {
      bridge?.getState()
        .then((snapshot) => {
          if (!cancelled) setState(snapshot);
        })
        .catch(() => {
          // Main process not ready yet; next tick will retry.
        });
    };

    const setup = () => {
      bridge = getBridge();
      if (!bridge) {
        // Preload not ready yet — keep retrying (max ~500ms)
        if (bridgeRetries++ < MAX_BRIDGE_RETRIES) {
          window.setTimeout(setup, 50);
        }
        return;
      }

      pull(); // immediate snapshot

      // Push: instant updates when main process emits state
      unsub = bridge.onStateUpdate((newState) => {
        if (!cancelled) setState(newState);
      });

      // Pull: 1-second safety net so we never show stale data
      snapshotTimer = window.setInterval(pull, 1_000);
    };

    setup();

    return () => {
      cancelled = true;
      if (snapshotTimer !== null) window.clearInterval(snapshotTimer);
      unsub?.();
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, []);

  const isDragging = useRef(false);
  const isModeTransitioning = useRef(false);

  // Global mouseup clears drag state so onMouseLeave can restore click-through
  useEffect(() => {
    const onMouseUp = () => {
      isDragging.current = false;
    };
    window.addEventListener('mouseup', onMouseUp);
    return () => window.removeEventListener('mouseup', onMouseUp);
  }, []);

  // Mouse enter/leave: toggle click-through passthrough
  const onMouseEnter = useCallback(() => {
    getBridge()?.setIgnoreMouse(false);
  }, []);

  const onMouseLeave = useCallback(() => {
    if (!isDragging.current && !isModeTransitioning.current) {
      getBridge()?.setIgnoreMouse(true);
    }
  }, []);

  const onMouseDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const onDragHandleDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    getBridge()?.setIgnoreMouse(false);
    getBridge()?.dragStart();

    const onUp = () => {
      isDragging.current = false;
      getBridge()?.dragEnd();
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mouseup', onUp);
  }, []);

  const expand = useCallback(() => {
    isModeTransitioning.current = true;
    getBridge()?.setMode('expanded');
    setTimeout(() => { isModeTransitioning.current = false; }, 300);
  }, []);
  const collapse = useCallback(() => {
    isModeTransitioning.current = true;
    getBridge()?.setMode('compact');
    setTimeout(() => { isModeTransitioning.current = false; }, 300);
  }, []);

  const blockType = state.schedule?.current?.type;
  const blockColor = blockType ? (BLOCK_COLORS[blockType] ?? '#a855f7') : '#a855f7';
  const isFocus = state.schedule?.current?.focus ?? false;
  const mode: WidgetMode = state.mode;
  const isBlockedAttemptAlert = (state.blockedAttemptFlashUntil ?? 0) > now;

  const classes = [
    'widget',
    `mode-${mode}`,
    isFocus ? 'focus-active' : '',
    isBlockedAttemptAlert ? 'blocked-attempt-alert' : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div
      className={classes}
      data-type={blockType ?? 'rest'}
      style={{ ['--accent-color' as string]: blockColor }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onMouseDown={onMouseDown}
    >
      <div
        key={mode}
        className={`view-panel ${mode === 'expanded' ? 'view-enter-expanded' : 'view-enter-compact'}`}
      >
        {mode === 'compact' ? (
          <CompactView state={state} onExpand={expand} blockColor={blockColor} onDragStart={onDragHandleDown} />
        ) : (
          <ExpandedView state={state} onCollapse={collapse} blockColor={blockColor} onDragStart={onDragHandleDown} />
        )}
      </div>
    </div>
  );
}
