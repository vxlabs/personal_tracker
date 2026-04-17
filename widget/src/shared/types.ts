export type BlockType =
  | 'ml'
  | 'content'
  | 'reading'
  | 'work'
  | 'football'
  | 'gym'
  | 'rest'
  | 'off'
  | 'routine'
  | 'deep';

export interface TimeBlock {
  start: string;
  end: string;
  type: BlockType;
  label: string;
  note?: string;
  focus?: boolean;
}

export type WidgetMode = 'compact' | 'expanded';

export type WidgetCorner =
  | 'top-left'
  | 'top-right'
  | 'bottom-left'
  | 'bottom-right';

export interface ScheduleNow {
  current: TimeBlock | null;
  next: TimeBlock | null;
  currentBlockStartEpoch: number | null;
  currentBlockEndEpoch: number | null;
}

export interface HabitStatus {
  id: string;        // key e.g. "active_recall" — used for color lookup
  habitId: number;   // numeric DB id — used for API calls
  label: string;
  icon: string;
  applicable: boolean;
  done: boolean;
}

export interface WidgetState {
  schedule: ScheduleNow | null;
  habits: HabitStatus[];
  lastUpdated: number;
  apiOnline: boolean;
  mode: WidgetMode;
  blockedAttemptFlashUntil: number | null;
}

export interface WindowPosition {
  x: number;
  y: number;
}

export interface DesktopRuntimeConfig {
  isDesktop: true;
  apiBaseUrl: string;
}

// IPC channel names
export const IPC = {
  STATE_UPDATE: 'state-update',
  SET_IGNORE_MOUSE: 'set-ignore-mouse',
  SET_MODE: 'set-mode',
  TOGGLE_HABIT: 'toggle-habit',
  GET_STATE: 'get-state',
  GET_RUNTIME_CONFIG: 'get-runtime-config',
  SHOW_MAIN_WINDOW: 'show-main-window',
  SHOW_WIDGET: 'show-widget',
  HIDE_WIDGET: 'hide-widget',
  TOGGLE_WIDGET: 'toggle-widget',
} as const;
