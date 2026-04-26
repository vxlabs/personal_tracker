import React, { useState, useCallback } from 'react';
import { WidgetState } from '../shared/types';
import { useCountdown } from './useCountdown';
import { getBridge } from './api';

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

const HABIT_COLORS: Record<string, string> = {
  active_recall: '#06b6d4',
  ig_caged: '#ef4444',
  one_screen: '#3b82f6',
  lunch_walk: '#22c55e',
  sleep_1115: '#a78bfa',
  day_review: '#f97316',
};

interface Props {
  state: WidgetState;
  onCollapse: () => void;
  blockColor: string;
  onDragStart: (e: React.MouseEvent) => void;
}

function formatDisplayTime(value: string): string {
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function ExpandedView({ state, onCollapse, blockColor, onDragStart }: Props) {
  const { schedule, habits } = state;
  const block = schedule?.current;
  const next = schedule?.next;
  const startEpoch = schedule?.currentBlockStartEpoch ?? null;
  const endEpoch = schedule?.currentBlockEndEpoch ?? null;

  const { label: countdownLabel, progressPct } = useCountdown(block, startEpoch, endEpoch);

  const doneCount = habits.filter((h) => h.done).length;
  const availableHabits = habits.filter((h) => h.applicable || h.done);
  const currentEmoji = block ? (BLOCK_EMOJI[block.type] ?? '▸') : '•';
  const nextTimeLabel = next?.start ? formatDisplayTime(next.start) : null;

  // Wiki quick capture state
  const [wikiUrl, setWikiUrl] = useState('');
  const [wikiStatus, setWikiStatus] = useState<'idle' | 'sending' | 'sent'>('idle');

  const isReadingBlock = block?.type === 'reading';

  function handleHabitClick(habitId: number, applicable: boolean) {
    if (!applicable) return;
    getBridge()?.toggleHabit(String(habitId));
  }

  const handleWikiCapture = useCallback(() => {
    const url = wikiUrl.trim();
    if (!url) return;
    setWikiStatus('sending');
    getBridge()?.wikiCapture(url);
    setWikiUrl('');
    setWikiStatus('sent');
    setTimeout(() => setWikiStatus('idle'), 2000);
  }, [wikiUrl]);

  const handleWikiCompile = useCallback(() => {
    getBridge()?.wikiCompilePending();
  }, []);

  const handleWikiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleWikiCapture();
  };

  return (
    <div className="expanded">
      <div className="expanded-header">
        <span className="drag-handle" title="Drag to move" onMouseDown={onDragStart}>⠿</span>
        <div className="expanded-title">
          <span className="expanded-emoji">{currentEmoji}</span>
          <div className="expanded-copy">
            <span className="expanded-label">
              {block ? block.label : 'No active block'}
              {!state.apiOnline && <span className="offline-badge"> ⚠</span>}
            </span>
            <span className="expanded-subtitle">
              {block ? `${formatDisplayTime(block.start)} - ${formatDisplayTime(block.end)}` : 'Waiting for schedule'}
            </span>
          </div>
        </div>
        <span className="expanded-time">{countdownLabel || '--'}</span>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{ width: `${progressPct}%`, background: blockColor }}
        />
      </div>

      <div className="habits-row">
        <span className="habits-label">Habits:</span>
        <div className="habit-dots no-drag">
          {availableHabits.length > 0 ? (
            availableHabits.map((h) => (
              <button
                key={h.id}
                className={`habit-dot${h.done ? ' done' : ''}${!h.applicable ? ' not-applicable' : ''}`}
                style={
                  h.done
                    ? { background: HABIT_COLORS[h.id] ?? '#a855f7' }
                    : { borderColor: HABIT_COLORS[h.id] ?? '#a855f7' }
                }
                aria-label={h.label}
                data-tooltip={`${h.icon} ${h.label}${h.applicable ? '' : ' (not due today)'}`}
                disabled={!h.applicable}
                onClick={() => handleHabitClick(h.habitId, h.applicable)}
              />
            ))
          ) : (
            <span className="habits-empty">No habits due</span>
          )}
        </div>
        <span className="habits-count">
          {doneCount}/{habits.length}
        </span>
      </div>

      <div className="next-block">
        <span className="next-label">Next</span>
        {next ? (
          <div className="next-copy">
            <span className="next-name">{next.label}</span>
            <span className="next-time">
              {nextTimeLabel ? `at ${nextTimeLabel}` : 'Later today'}
            </span>
          </div>
        ) : (
          <span className="next-time">No upcoming block</span>
        )}
      </div>

      {/* Wiki section */}
      <div className="wiki-section no-drag">
        {isReadingBlock && (
          <div className="wiki-prompt">
            📖 What are you reading? Capture it ↓
          </div>
        )}
        <div className="wiki-capture-row">
          <span className="wiki-label">📚</span>
          {state.wikiAgent && (
            <span className="wiki-agent-badge" title={`Default wiki agent: ${state.wikiAgent.name}`}>
              {state.wikiAgent.name}
            </span>
          )}
          {state.wikiPendingCount > 0 && (
            <span className="wiki-pending-badge" title="Sources pending compilation">
              {state.wikiPendingCount} pending
            </span>
          )}
          <input
            className="wiki-url-input"
            type="text"
            value={wikiUrl}
            onChange={(e) => setWikiUrl(e.target.value)}
            onKeyDown={handleWikiKeyDown}
            placeholder="Capture URL…"
            disabled={wikiStatus === 'sending'}
          />
          <button
            className={`wiki-capture-btn${wikiStatus === 'sent' ? ' sent' : ''}`}
            onClick={handleWikiCapture}
            disabled={wikiStatus === 'sending' || !wikiUrl.trim()}
            title="Save to wiki"
          >
            {wikiStatus === 'sent' ? '✓' : '→'}
          </button>
        </div>
        {state.wikiPendingCount > 0 && (
          <button
            className="wiki-compile-btn"
            onClick={handleWikiCompile}
            disabled={state.wikiCompiling}
            title={state.wikiAgent ? `Compile with ${state.wikiAgent.name}` : 'Compile pending sources'}
          >
            {state.wikiCompiling ? 'Compiling...' : `Compile ${state.wikiPendingCount}`}
          </button>
        )}
      </div>

      <div className="expanded-actions no-drag">
        <button className="action-btn" onClick={onCollapse} aria-label="Collapse widget">
          ▲ Compact
        </button>
      </div>
    </div>
  );
}
