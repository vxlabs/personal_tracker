import { useState, useEffect } from 'react';
import { TimeBlock } from '../shared/types';

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function todayEpochFromHHMM(hhmm: string): number {
  const now = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).getTime();
}

interface CountdownResult {
  label: string;
  progressPct: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function useCountdown(
  block: TimeBlock | null | undefined,
  startEpoch: number | null,
  endEpoch: number | null
): CountdownResult {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!block) return { label: '', progressPct: 0 };

  // Derive end epoch locally if API didn't provide one
  const end = endEpoch ?? todayEpochFromHHMM(block.end);
  const start = startEpoch ?? todayEpochFromHHMM(block.start);

  const remaining = Math.max(0, end - now);
  const total = end - start;
  const elapsed = now - start;

  const progressPct = total > 0 ? clamp((elapsed / total) * 100, 0, 100) : 0;

  const totalMinutes = Math.ceil(remaining / 60_000);

  let label: string;
  if (remaining === 0) {
    label = 'done';
  } else if (totalMinutes >= 60) {
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    label = minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`;
  } else {
    label = `${totalMinutes}m`;
  }

  return { label, progressPct };
}
