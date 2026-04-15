export const TIMING_CONFIG = {
  /** Poll current schedule block (`/api/schedule/now`) */
  SCHEDULE_NOW_POLL_MS: 30_000,
  /** Recompute "today" stats (focus minutes, etc.) on a steady tick */
  DASHBOARD_STATS_TICK_MS: 60_000,
  /** Move the schedule week view current-time line */
  WEEK_VIEW_CLOCK_TICK_MS: 60_000,
  /** Focus session timer tick (elapsed/remaining seconds) */
  FOCUS_TIMER_TICK_MS: 1_000,
  /** Default break duration in seconds (5 minutes) */
  FOCUS_BREAK_DURATION_S: 300,
  /** Poll active focus session from server */
  FOCUS_CURRENT_POLL_MS: 30_000,
  /** Rank-up celebration overlay auto-dismiss */
  RANK_UP_TOAST_MS: 5_000,
} as const
