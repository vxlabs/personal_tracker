# API Reference

Base URL (local): `http://localhost:5000/api`

All responses are JSON. All time values are ISO 8601. The backend resolves "now" in **IST (UTC+5:30)**.

---

## Schedule

### `GET /api/schedule`

Returns the full weekly schedule grouped by day.

**Response**
```json
{
  "monday": [ { "id": 1, "startTime": "06:00", "endTime": "06:30", "type": "Morning", "label": "Wake up", "note": null, "isFocusBlock": false } ],
  "tuesday": [ ... ],
  ...
}
```

---

### `GET /api/schedule/now`

Returns the current active block and the next upcoming block based on IST time.

**Response**
```json
{
  "currentBlock": {
    "id": 5,
    "label": "ML Study",
    "type": "Focus",
    "startTime": "08:00",
    "endTime": "10:00",
    "note": "Active recall. Phone on DND",
    "isFocusBlock": true
  },
  "nextBlock": {
    "id": 6,
    "label": "Breakfast",
    "type": "Break",
    "startTime": "10:00",
    "endTime": "10:30"
  },
  "minutesRemaining": 47,
  "percentComplete": 60.4
}
```

---

### `GET /api/schedule/{day}`

Returns all blocks for a specific day.

**Path parameter:** `day` — one of `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`

---

### `PUT /api/schedule/{day}`

Replaces the schedule for a given day.

**Request body:** Array of time block objects (same shape as GET response items).

---

## Habits

### `GET /api/habit`

Returns all habits with today's completion status and streak data.

**Response**
```json
[
  {
    "id": 1,
    "key": "morning_walk",
    "label": "Morning Walk",
    "icon": "🚶",
    "isCompletedToday": false,
    "currentStreak": 14,
    "longestStreak": 21,
    "isApplicableToday": true
  }
]
```

---

### `POST /api/habit/{id}/check`

Marks a habit as completed for today.

**Response:** `204 No Content`

---

### `DELETE /api/habit/{id}/check`

Unchecks a habit for today.

**Response:** `204 No Content`

---

## Focus

### `POST /api/focus/start`

Starts a new focus session.

**Request body**
```json
{ "blockType": "Focus", "blockLabel": "ML Study" }
```

**Response**
```json
{ "sessionId": 42, "startedAt": "2026-04-15T08:15:00+05:30" }
```

---

### `POST /api/focus/stop`

Stops the active focus session.

**Request body**
```json
{ "sessionId": 42 }
```

**Response**
```json
{ "durationMinutes": 47, "xpEarned": 10 }
```

---

### `GET /api/focus/sessions`

Returns past focus sessions, newest first.

**Query params:** `?limit=20&offset=0`

---

### `GET /api/focus/blocked-sites`

Returns the list of domains that should be blocked during focus blocks.

**Response**
```json
[ { "id": 1, "domain": "youtube.com", "isActive": true }, ... ]
```

---

### `POST /api/focus/blocked-attempt`

Logs a blocked site navigation attempt (called by the browser extension).

**Request body**
```json
{ "domain": "youtube.com", "blockType": "Focus" }
```

**Response:** `204 No Content`

---

## Blocked Sites

### `GET /api/blocked-sites`

Returns all configured blocked domains.

### `POST /api/blocked-sites`

Adds a domain to the blocked list.

**Request body**
```json
{ "domain": "instagram.com" }
```

### `DELETE /api/blocked-sites/{id}`

Removes a domain from the blocked list.

---

## XP

### `GET /api/xp`

Returns current XP total, rank, and progress to next rank.

**Response**
```json
{
  "totalXp": 2340,
  "rank": "Sergeant",
  "nextRank": "Lieutenant",
  "xpToNextRank": 660,
  "progressPercent": 56.0
}
```

---

### `GET /api/xp/ledger`

Returns the XP transaction history, newest first.

**Response**
```json
[
  { "id": 101, "source": "HabitCheck", "amount": 10, "earnedAt": "2026-04-15T09:00:00+05:30" },
  { "id": 100, "source": "DailyReview", "amount": 20, "earnedAt": "2026-04-14T22:31:00+05:30" }
]
```

---

## Notifications

### `POST /api/notification/subscribe`

Registers a browser push subscription (VAPID).

**Request body**
```json
{
  "endpoint": "https://fcm.googleapis.com/...",
  "p256dh": "...",
  "auth": "..."
}
```

**Response:** `204 No Content`

---

### `GET /api/notification/settings`

Returns per-type notification preferences.

**Response**
```json
[
  { "type": "BlockTransition", "isEnabled": true },
  { "type": "HabitReminder", "isEnabled": true },
  { "type": "SleepWarning", "isEnabled": true },
  { "type": "DailyReviewPrompt", "isEnabled": true }
]
```

---

### `PUT /api/notification/settings`

Updates notification preferences.

**Request body:** Same shape as GET response.

---

## Review

### `POST /api/review/daily`

Submits a daily review.

**Request body**
```json
{
  "date": "2026-04-15",
  "entry1": "Learned about attention mechanisms in transformers",
  "entry2": "Finished the weekly report feature",
  "entry3": "Did not skip the morning walk"
}
```

**Response:** `204 No Content`

---

### `GET /api/review/daily`

Returns past daily reviews.

**Query params:** `?date=2026-04-15` (specific date) or `?from=2026-04-01&to=2026-04-15` (range)

---

### `GET /api/review/weekly`

Returns the aggregated weekly report.

**Query params:** `?week=2026-W16`

**Response**
```json
{
  "weekLabel": "2026-W16",
  "habitCompliance": [
    { "habitKey": "morning_walk", "label": "Morning Walk", "completedDays": 6, "applicableDays": 6, "percent": 100 }
  ],
  "focusHoursTotal": 18.5,
  "focusBreakdown": [
    { "blockType": "Focus", "hours": 14.0 },
    { "blockType": "ContentResearch", "hours": 4.5 }
  ],
  "dailyReviews": [
    { "date": "2026-04-14", "entry1": "...", "entry2": "...", "entry3": "..." }
  ],
  "weekScore": 87,
  "streaks": [
    { "habitKey": "morning_walk", "currentStreak": 14, "longestStreak": 21 }
  ]
}
```
