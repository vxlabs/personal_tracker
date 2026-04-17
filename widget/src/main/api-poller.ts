import { BrowserWindow, ipcMain, powerMonitor } from 'electron';
import { IPC, WidgetState, HabitStatus, TimeBlock, WidgetMode } from '../shared/types';
import { updateTrayStatus } from './tray';

let apiBaseUrl = 'http://localhost:5000/api';
const POLL_INTERVAL_MS = 30_000;
const POLL_INTERVAL_OFFLINE_MS = 5_000; // retry faster while API is unreachable
const ALERT_POLL_INTERVAL_MS = 5_000;
const BLOCKED_ATTEMPT_FLASH_MS = 2_800;

// ── Raw API shapes ────────────────────────────────────────────────────────────

// Shape of each block returned by GET /api/schedule/{day}
interface ApiBlockDto {
  id: number;
  dayOfWeek: string;
  startTime: string;    // "HH:mm" 24-hour
  endTime: string;      // "HH:mm" 24-hour
  type: string;
  label: string;
  note: string | null;
  isFocusBlock: boolean;
  sortOrder: number;
}

interface ApiHabit {
  habitId: number;
  key: string;
  label: string;
  icon: string;
  isApplicableToday: boolean;
  isCompletedToday: boolean;
}

interface ApiRecentBlockedAttempt {
  id: number;
  domain: string;
  blockedAt: string;
  blockLabel?: string | null;
  blockType?: string | null;
}

// ── Day-schedule cache ────────────────────────────────────────────────────────

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

let cachedDayBlocks: ApiBlockDto[] = [];
let cachedDay = -1; // 0=Sun … 6=Sat, -1=not loaded

// ── Time helpers ──────────────────────────────────────────────────────────────

function parseHHMM(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function todayEpochFromHHMM(hhmm: string): number {
  const now = new Date();
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m, 0, 0).getTime();
}

// ── Normalizers ───────────────────────────────────────────────────────────────

function normalizeBlock(b: ApiBlockDto): TimeBlock {
  return {
    start: b.startTime,
    end: b.endTime,
    type: b.type as TimeBlock['type'],
    label: b.label,
    note: b.note ?? undefined,
    focus: b.isFocusBlock,
  };
}

function normalizeHabits(raw: ApiHabit[]): HabitStatus[] {
  return raw.map((h) => ({
    id: h.key,
    habitId: h.habitId,
    label: h.label,
    icon: h.icon,
    applicable: h.isApplicableToday,
    done: h.isCompletedToday,
  }));
}

// ── Schedule computation (local, no API call after first fetch) ───────────────

function computeScheduleNow(blocks: ApiBlockDto[]): WidgetState['schedule'] {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

  let currentBlock: ApiBlockDto | null = null;
  let nextBlock: ApiBlockDto | null = null;

  for (let i = 0; i < blocks.length; i++) {
    const start = parseHHMM(blocks[i].startTime);
    const end   = parseHHMM(blocks[i].endTime);
    if (currentMinutes >= start && currentMinutes < end) {
      currentBlock = blocks[i];
      nextBlock    = blocks[i + 1] ?? null;
      break;
    }
  }

  // Not in any block — find the next upcoming block today
  if (!currentBlock) {
    nextBlock = blocks.find((b) => parseHHMM(b.startTime) > currentMinutes) ?? null;
  }

  return {
    current:                currentBlock ? normalizeBlock(currentBlock) : null,
    next:                   nextBlock    ? normalizeBlock(nextBlock)    : null,
    currentBlockStartEpoch: currentBlock ? todayEpochFromHHMM(currentBlock.startTime) : null,
    currentBlockEndEpoch:   currentBlock ? todayEpochFromHHMM(currentBlock.endTime)   : null,
  };
}

// ── Poller ────────────────────────────────────────────────────────────────────

let pollTimer: ReturnType<typeof setInterval> | null = null;
let alertPollTimer: ReturnType<typeof setInterval> | null = null;
let lastState: WidgetState = {
  schedule: null,
  habits: [],
  lastUpdated: 0,
  apiOnline: false,
  mode: 'compact',
  blockedAttemptFlashUntil: null,
};
let activeWidget: BrowserWindow | null = null;
let resumeHandler: (() => void) | null = null;
let habitToggleHandler:
  | ((_event: Electron.IpcMainEvent, habitId: string | number) => Promise<void>)
  | null = null;
let lastBlockedAttemptId: number | null = null;
// One-shot callback fired when the first non-rest block is detected (used for startup auto-show)
let firstNonRestCallback: (() => void) | null = null;

async function fetchJson<T>(url: string): Promise<T> {
  console.log(`[ApiPoller] GET ${url}`);
  const r = await fetch(url);
  if (!r.ok) throw new Error(`HTTP ${r.status} — ${url}`);
  return r.json() as Promise<T>;
}

function apiUrl(path: string): string {
  return `${apiBaseUrl}${path}`;
}

function formatTimeLabel(value?: string): string | undefined {
  if (!value) return undefined;
  const [hours, minutes] = value.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function emitState(): void {
  if (!activeWidget || activeWidget.isDestroyed()) return;
  console.log(`[ApiPoller] emitState → apiOnline=${lastState.apiOnline}, current=${lastState.schedule?.current?.label ?? 'none'}, lastUpdated=${lastState.lastUpdated}`);
  activeWidget.webContents.send(IPC.STATE_UPDATE, lastState);
}

// Fetch today's full schedule once; re-fetches automatically when the day rolls over.
async function ensureDaySchedule(): Promise<boolean> {
  const today = new Date().getDay();
  if (cachedDay === today && cachedDayBlocks.length > 0) return true;
  try {
    cachedDayBlocks = await fetchJson<ApiBlockDto[]>(apiUrl(`/schedule/${DAY_NAMES[today]}`));
    cachedDay = today;
    return true;
  } catch (err) {
    console.error(`[ApiPoller] ensureDaySchedule failed for ${DAY_NAMES[today]}:`, err);
    // Keep stale cache if API is temporarily unreachable
    return cachedDayBlocks.length > 0;
  }
}

async function fetchState(): Promise<Partial<WidgetState>> {
  const [scheduleOk, habitsRes] = await Promise.all([
    ensureDaySchedule(),
    Promise.allSettled([fetchJson<ApiHabit[]>(apiUrl('/habits/today'))]).then((r) => r[0]),
  ]);

  return {
    schedule: scheduleOk
      ? computeScheduleNow(cachedDayBlocks)
      : lastState.schedule,
    habits: habitsRes.status === 'fulfilled'
      ? normalizeHabits(habitsRes.value)
      : lastState.habits,
    apiOnline: scheduleOk || habitsRes.status === 'fulfilled',
  };
}

async function poll(widget: BrowserWindow): Promise<void> {
  try {
    const fresh = await fetchState();
    const wasOffline = !lastState.apiOnline;
    lastState = { ...lastState, ...fresh, lastUpdated: Date.now() };
    console.log(`[ApiPoller] poll OK — apiOnline=${fresh.apiOnline}, current=${fresh.schedule?.current?.label ?? 'none'}`);

    // If we just came back online after being offline, reset to the normal poll interval
    if (wasOffline && fresh.apiOnline) {
      console.log('[ApiPoller] API back online — switching to normal poll interval');
      reschedulePoll(widget, POLL_INTERVAL_MS);
    }
  } catch (err) {
    console.error('[ApiPoller] poll failed:', err);
    const wasOnline = lastState.apiOnline;
    lastState = { ...lastState, apiOnline: false };

    // Switch to faster retry interval when we go offline
    if (wasOnline) {
      console.log('[ApiPoller] API went offline — switching to fast retry interval');
      reschedulePoll(widget, POLL_INTERVAL_OFFLINE_MS);
    }
  }

  // Update tray
  const current = lastState.schedule?.current;
  const next = lastState.schedule?.next;
  const mins = Math.round(
    ((lastState.schedule?.currentBlockEndEpoch ?? Date.now()) - Date.now()) / 60_000
  );
  const remaining = current && mins > 0 ? `${mins} min` : undefined;
  const tooltip = current
    ? `${current.label}${remaining ? ` — ${remaining} remaining` : ''}`
    : 'Protocol';

  updateTrayStatus({
    currentLabel: current?.label,
    timeRemaining: remaining,
    nextLabel: next?.label,
    nextTime: formatTimeLabel(next?.start),
    blockType: current?.type,
    tooltip,
  });

  // Fire the startup auto-show callback once when a non-rest block is active
  if (firstNonRestCallback && lastState.schedule?.current) {
    const { type } = lastState.schedule.current;
    if (type !== 'rest' && type !== 'off') {
      firstNonRestCallback();
      firstNonRestCallback = null;
    }
  }

  emitState();
}

async function pollBlockedAttemptAlert(): Promise<void> {
  try {
    const recent = await fetchJson<ApiRecentBlockedAttempt | null>(
      apiUrl('/focus/blocked-attempts/recent?seconds=45')
    );

    if (!recent || recent.id === lastBlockedAttemptId) {
      return;
    }

    lastBlockedAttemptId = recent.id;

    if (lastState.schedule?.current?.focus) {
      lastState = {
        ...lastState,
        blockedAttemptFlashUntil: Date.now() + BLOCKED_ATTEMPT_FLASH_MS,
        lastUpdated: Date.now(),
      };
      emitState();
    }
  } catch {
    // Non-fatal: alert feed can miss a pulse without affecting the main widget state.
  }
}

function reschedulePoll(widget: BrowserWindow, intervalMs: number): void {
  if (pollTimer) {
    clearInterval(pollTimer);
  }
  pollTimer = setInterval(() => {
    if (activeWidget && !activeWidget.isDestroyed()) {
      void poll(activeWidget);
    }
  }, intervalMs);
}

export function startApiPoller(widget: BrowserWindow): void {
  activeWidget = widget;

  if (pollTimer) {
    clearInterval(pollTimer);
  }

  // Start with fast polling — switches to normal 30s once the API is confirmed online
  poll(widget);
  pollTimer = setInterval(() => {
    if (activeWidget && !activeWidget.isDestroyed()) {
      void poll(activeWidget);
    }
  }, POLL_INTERVAL_OFFLINE_MS);

  if (alertPollTimer) {
    clearInterval(alertPollTimer);
  }
  alertPollTimer = setInterval(() => {
    void pollBlockedAttemptAlert();
  }, ALERT_POLL_INTERVAL_MS);
  void pollBlockedAttemptAlert();

  if (!resumeHandler) {
    resumeHandler = () => {
      cachedDay = -1; // invalidate cache — may have slept past midnight
      if (activeWidget && !activeWidget.isDestroyed()) {
        void poll(activeWidget);
        void pollBlockedAttemptAlert();
      }
    };
    powerMonitor.on('resume', resumeHandler);
  }

  if (!habitToggleHandler) {
    // Habit toggle — renderer sends habitId as a string (IPC serialization)
    habitToggleHandler = async (_event, habitId: string | number) => {
      const numId = Number(habitId);
      const habit = lastState.habits.find((h) => h.habitId === numId);
      if (!habit) return;
      try {
        const method = habit.done ? 'DELETE' : 'POST';
        await fetch(apiUrl(`/habits/${numId}/check`), { method });
        if (activeWidget && !activeWidget.isDestroyed()) {
          await poll(activeWidget);
        }
      } catch {
        // API offline — ignore
      }
    };
    ipcMain.on(IPC.TOGGLE_HABIT, habitToggleHandler);
  }
}

export function stopApiPoller(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }

  if (alertPollTimer) {
    clearInterval(alertPollTimer);
    alertPollTimer = null;
  }

  if (resumeHandler) {
    powerMonitor.removeListener('resume', resumeHandler);
    resumeHandler = null;
  }

  if (habitToggleHandler) {
    ipcMain.removeListener(IPC.TOGGLE_HABIT, habitToggleHandler);
    habitToggleHandler = null;
  }

  activeWidget = null;
}

export function getLastWidgetState(): WidgetState {
  return lastState;
}

export function setApiBaseUrl(nextApiBaseUrl: string): void {
  apiBaseUrl = nextApiBaseUrl.replace(/\/$/, '');
}

/** Register a one-shot callback that fires when the first non-rest block is detected.
 *  Used by main.ts to auto-show the widget at startup. Pass null to cancel. */
export function setFirstNonRestBlockCallback(callback: (() => void) | null): void {
  firstNonRestCallback = callback;
}

export function setWidgetMode(mode: WidgetMode): void {
  lastState = {
    ...lastState,
    mode,
    lastUpdated: Date.now(),
  };
  emitState();
}
