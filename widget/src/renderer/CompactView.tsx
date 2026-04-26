import React from 'react';
import { WidgetState } from '../shared/types';
import { useCountdown } from './useCountdown';

const BLOCK_EMOJI: Record<string, string> = {
  ml: '🧠',
  content: '🎬',
  reading: '📚',
  work: '💼',
  football: '⚽',
  gym: '🏋️',
  rest: '☕',
  off: '🌿',
  routine: '🌅',
  deep: '🔬',
};

interface Props {
  state: WidgetState;
  onExpand: () => void;
  blockColor: string;
  onDragStart: (e: React.MouseEvent) => void;
}

export function CompactView({ state, onExpand, blockColor, onDragStart }: Props) {
  const { schedule } = state;
  const block = schedule?.current;
  const startEpoch = schedule?.currentBlockStartEpoch ?? null;
  const endEpoch = schedule?.currentBlockEndEpoch ?? null;

  const { label: countdownLabel, progressPct } = useCountdown(block, startEpoch, endEpoch);

  if (!block) {
    return (
      <div className="no-block">
        No active block{!state.apiOnline && <span className="offline-badge">⚠ offline</span>}
        {state.wikiPendingCount > 0 && (
          <span className="wiki-badge" title={`${state.wikiPendingCount} wiki source(s) pending`}>
            📚 {state.wikiPendingCount}
          </span>
        )}
      </div>
    );
  }

  const emoji = BLOCK_EMOJI[block.type] ?? '▸';

  return (
    <div className="compact">
      <div className="compact-row">
        <span className="drag-handle" title="Drag to move" onMouseDown={onDragStart}>⠿</span>
        <span className="block-label">
          <span className="block-emoji">{emoji}</span>
          {block.label}
          {!state.apiOnline && <span className="offline-badge">⚠</span>}
        </span>
        <span className="countdown no-drag">{countdownLabel}</span>
        {state.wikiPendingCount > 0 && (
          <span
            className="wiki-badge no-drag"
            title={`${state.wikiPendingCount} wiki source(s) pending compilation`}
          >
            📚{state.wikiPendingCount}
          </span>
        )}
        <button
          className="expand-btn no-drag"
          onClick={onExpand}
          title="Expand"
          aria-label="Expand widget"
        >
          ▼
        </button>
      </div>
      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%`, background: blockColor }}
        />
      </div>
    </div>
  );
}
