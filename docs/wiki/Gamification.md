# Gamification

Protocol uses an XP and rank system to reinforce daily discipline. Every completed habit, focus session, review, and streak milestone earns XP. Ranks unlock as your total XP grows.

---

## XP Sources

| Action | XP |
|---|---|
| Complete a habit | +10 |
| Focus session (per 30 min completed) | +5 |
| Submit daily review | +20 |
| Perfect day (all applicable habits done) | +50 bonus |
| 7-day streak milestone | +100 |
| 14-day streak milestone | +200 |
| 30-day streak milestone | +500 |

XP is additive and never decreases. Each transaction is recorded in the `XpLedger` table with a source label and timestamp.

---

## Ranks

| Rank | XP Required |
|---|---|
| Recruit | 0 |
| Soldier | 500 |
| Sergeant | 1,500 |
| Lieutenant | 3,000 |
| Captain | 5,000 |
| Commander | 8,000 |
| General | 12,000 |

The current rank and progress toward the next rank are available from `GET /api/xp`.

---

## Rank Display

The active rank badge appears in the sidebar of the web app and in the Electron widget's expanded view. A level-up notification fires (browser push + in-app toast) when a rank threshold is crossed.

---

## XP Ledger

Every XP transaction is stored for auditing and the weekly report. The weekly report includes total XP earned that week and a comparison to the previous week.

Access via `GET /api/xp/ledger`.

---

## Streak Logic

Streaks are calculated by `StreakCalculator.cs`:

- A streak increments for each consecutive day a habit is completed.
- Days where the habit is **not applicable** (e.g., a work habit on Sunday) are skipped and do not break the streak.
- The streak breaks if an applicable day passes without completion.

**Weekend rules:**
- Saturday: only habits flagged as applicable on Saturdays count. Work habits are excluded.
- Sunday: only the "sleep" habit applies. All other habits are excluded.

Longest streak is tracked per habit and never decreases.
