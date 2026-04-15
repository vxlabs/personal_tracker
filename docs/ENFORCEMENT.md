# ENFORCEMENT.md — Device Blocking + Progress Tracking Strategy

## The Reality of App Blocking

A web app CANNOT directly block apps on iOS or Android — both platforms sandbox third-party apps. But we can build a **layered enforcement system** that combines native OS features + our Protocol app + browser extension.

---

## Layer 1: iOS Enforcement (iPhone)

### A. iOS Focus Modes (Built-in, Free, Powerful)

Create **4 custom Focus Modes** in Settings → Focus:

| Focus Mode | Schedule | Allowed Apps | Blocked |
|------------|----------|-------------|---------|
| **🧠 Deep Work** | Manual trigger during ML/Content/Reading blocks | Notes, Safari (for docs), Calculator, Protocol PWA | Instagram, YouTube, Netflix, Twitter, Reddit, all social |
| **💼 Office** | Auto 2:30 PM–10:30 PM weekdays | Work apps, Slack, Teams, Protocol PWA | Instagram, YouTube, Netflix, games |
| **🌙 Wind Down** | Auto 10:30 PM–6:00 AM daily | Clock, Protocol PWA, Health | Everything else. Grayscale on |
| **🏖️ Off Day** | Manual on Sundays | Everything | Nothing blocked (it's your rest day) |

**iOS Automation via Shortcuts App:**
- Create time-based automations that auto-enable Focus Modes at schedule transitions
- Automation: At 8:15 AM weekdays → Enable "Deep Work" Focus
- Automation: At 2:30 PM weekdays → Enable "Office" Focus
- Automation: At 10:30 PM daily → Enable "Wind Down" Focus
- These run silently with "Ask Before Running" turned off

### B. Screen Time Limits (Secondary Layer)
- Settings → Screen Time → App Limits
- Set Instagram to **20 min/day** (covers breakfast + dinner IG windows)
- Set YouTube to **30 min/day** (only for show watching window)
- Set a Screen Time passcode — write it on paper, put it in a drawer (make it inconvenient to override)
- Enable "One More Minute" warnings

### C. Protocol PWA Notifications
- Our Protocol app sends push notifications via Safari/PWA
- Block transition reminders: "ML Study starts in 5 min — Deep Work Focus activating"
- Habit check-ins: "Did you do your lunch walk?"
- Sleep warning: "30 min to lights out"
- The PWA shows the NOW card on the home screen

### D. iOS Shortcuts Webhook Integration (Phase 2)
Our .NET API can expose a webhook endpoint that iOS Shortcuts can call:
```
POST /api/device/checkin
Body: { "focusMode": "DeepWork", "timestamp": "2026-04-13T08:15:00+05:30" }
```
- When a Focus Mode activates, the Shortcut also POSTs to our API
- Protocol app tracks which Focus Modes were active and when
- Weekly report shows: "Focus Mode compliance: 92% — you missed Deep Work on Thursday"

---

## Layer 2: Android Enforcement

### A. Digital Wellbeing Focus Mode (Built-in)
- Settings → Digital Wellbeing → Focus Mode
- Create a schedule matching Protocol schedule blocks
- Select apps to pause: Instagram, YouTube, Netflix, Twitter, Reddit, games
- Schedule: 8:15 AM–12:30 PM (morning deep work blocks) and 2:30 PM–10:30 PM (work block)
- When Focus Mode is active, blocked apps are greyed out and won't open
- PIN-protect the app limits so you can't easily override

### B. Digital Wellbeing App Timers
- Instagram: 20 min/day
- YouTube: 30 min/day
- Set a PIN on app limits (separate from screen lock PIN)

### C. Bedtime Mode
- Schedule: 11:00 PM–6:00 AM
- Enables Do Not Disturb
- Screen goes grayscale (makes phone boring)
- Silences notifications

### D. DigiPaws (Open Source, Free — Optional Power User)
For even stricter blocking on Android:
- Install from F-Droid: DigiPaws
- Features: App blocking with schedule, anti-uninstall protection, custom block messages
- Auto Focus: Block selected apps at specified hours
- Can block Instagram Reels specifically while allowing DMs

### E. Protocol PWA on Android
- Chrome → Protocol app → "Add to Home Screen"
- Push notifications work natively on Android Chrome
- Same NOW card, same habit tracking, same alerts

---

## Layer 3: Desktop Enforcement (PC/Mac)

### A. Chrome Extension (Built as Part of Protocol App — Phase 3)
- During focus blocks, navigating to blocked sites shows redirect page
- "NOT NOW. You're in ML Study mode. 47 minutes remaining."
- Syncs with Protocol API for current schedule block
- Tracks blocked attempts for weekly report

### B. Browser-Level (Immediate, No Code Needed)
- Install **LeechBlock NG** (Chrome/Firefox extension) as a stopgap
- Configure schedules matching Protocol blocks:
  - Block instagram.com, youtube.com, reddit.com, twitter.com during 8:15 AM–12:30 PM and 2:30 PM–10:30 PM weekdays
  - Allow during breakfast (7:30–8:15) and dinner (10:30–11:15) windows
- Set a random access code (write it down, put it away)

### C. macOS Focus Modes (Mac Mini)
- System Settings → Focus → create matching focus modes
- Link to iPhone focus modes for cross-device sync
- When "Deep Work" activates on iPhone, Mac follows automatically

---

## Layer 4: Progress Tracking & Gamification (In Protocol App)

### A. Dashboard Metrics

**Daily View:**
- NOW card (current block + countdown)
- Habit completion: X/6 with visual checkboxes
- Focus hours today: total deep work hours logged
- Streak fire: longest active streak count
- Device compliance: were Focus Modes active? (via webhook check-in)

**Weekly View:**
- Habit completion heatmap (7×6 grid, color intensity = completion)
- Focus hours bar chart (Mon–Sun)
- Weekly score out of 100
- Streak timeline (which habits maintained, which broke)
- "Wins" callouts: personal bests, milestones

**Monthly View:**
- Trend lines: are habits improving over time?
- Monthly score trend
- Best week / worst week comparison
- Cumulative stats: total focus hours, total streak days, review entries

### B. Streak System

| Streak Length | Visual | Reward |
|--------------|--------|--------|
| 1–6 days | 🔥 | — |
| 7 days (1 week) | 🔥🔥 | +100 XP |
| 14 days | 🔥🔥🔥 | +200 XP |
| 21 days | 💎 | +300 XP, "Habit Locked" badge |
| 30 days | 💎🔥 | +500 XP, "Unbreakable" badge |
| 60 days | 👑 | +1000 XP, "Commander" badge |
| 90 days | 🏆 | +2000 XP, "Legend" badge |

Streak break rules:
- Missing one day = streak resets to 0
- Sunday (off day): only "sleep by 11:15" applies. Other habits don't count against streaks.
- Saturday: reduced set (gym, reading, sleep)

### C. XP & Rank System

**XP Sources:**
| Action | XP |
|--------|-----|
| Complete a habit | +10 |
| Complete ALL habits in a day | +50 bonus |
| Focus session (per 30 min) | +5 |
| Submit daily review | +20 |
| Streak milestone (7/14/21/30/60/90) | +100 to +2000 |
| Perfect week (all habits, all days) | +200 |
| Device Focus Mode compliance (per day) | +15 |

**Rank Progression:**
| Rank | XP Required | Badge |
|------|------------|-------|
| Recruit | 0 | ⚪ |
| Soldier | 500 | 🟢 |
| Sergeant | 1,500 | 🔵 |
| Lieutenant | 3,500 | 🟣 |
| Captain | 6,000 | 🟡 |
| Major | 10,000 | 🟠 |
| Commander | 15,000 | 🔴 |
| General | 25,000 | 💎 |
| Marshal | 50,000 | 👑 |

Rank is displayed in the sidebar, with a progress bar showing XP to next rank. Level-up triggers a push notification + animation.

### D. Weekly Report Card

Generated every Sunday at 8 PM (or on demand). Contains:

```
╔══════════════════════════════════════════╗
║           WEEK 16 — PROTOCOL REPORT      ║
╠══════════════════════════════════════════╣
║ Overall Score:     87/100                ║
║ Rank:              Lieutenant 🟣         ║
║ XP Earned:         +340                  ║
║                                          ║
║ HABITS                                   ║
║ ✅ Active Recall      6/6 days  🔥14     ║
║ ✅ IG Caged           5/6 days  🔥5      ║
║ ✅ 1 Screen 1 Task    6/6 days  🔥14     ║
║ ⚠️ Lunch Walk         4/6 days  🔥4      ║
║ ✅ Sleep by 11:15      5/7 days  🔥12     ║
║ ✅ Day Review          6/6 days  🔥21 💎  ║
║                                          ║
║ FOCUS                                    ║
║ Total focus hours:    28.5h              ║
║ ML Study:             8h                 ║
║ Content:              10.5h              ║
║ Reading:              5h                 ║
║ Pet Projects:         5h (Sat)           ║
║                                          ║
║ DEVICE COMPLIANCE                        ║
║ Focus Modes active:   92%                ║
║ Blocked site attempts: 3 (down from 7)  ║
║                                          ║
║ TOP LEARNINGS (from daily reviews)       ║
║ • Gradient descent intuition clicked     ║
║ • Learned about ONNX model export       ║
║ • Content hook technique from Ali Abdaal ║
╚══════════════════════════════════════════╝
```

### E. Progress Visualizations

1. **GitHub-style contribution heatmap** — 365-day grid, color = daily score
2. **Streak flame chart** — horizontal bars per habit showing streak continuity
3. **Focus hours stacked area chart** — weekly trend by category
4. **XP curve** — cumulative XP over time with rank milestones marked
5. **Compliance radar chart** — 6 axes (one per habit), filled area shows completion %

---

## Implementation: What Goes Where

### In Protocol App (what we build):
- Push notifications for block transitions, habit reminders, sleep warning
- NOW card dashboard
- Habit tracking with streaks
- Focus session timer
- Daily review capture
- XP/rank system
- Weekly report generation
- Progress visualizations
- Device check-in webhook API (`POST /api/device/checkin`)
- Blocked sites advisory list

### On iPhone (manual setup, one-time):
- 4 Focus Modes created manually
- iOS Shortcuts automations for auto-switching
- Screen Time limits (Instagram 20 min, YouTube 30 min)
- Protocol PWA installed on home screen
- Optional: Shortcuts webhook to Protocol API

### On Android (manual setup, one-time):
- Digital Wellbeing Focus Mode schedule
- App timers (Instagram 20 min, YouTube 30 min)
- Bedtime Mode 11 PM–6 AM
- Protocol PWA installed on home screen
- Optional: DigiPaws for stricter control

### On Desktop (manual setup, one-time):
- LeechBlock NG browser extension (immediate stopgap)
- macOS Focus Modes synced with iPhone
- Protocol Chrome extension (Phase 3 of app build)

---

## Setup Guide (Ship with the App)

The Protocol app should include a `/setup` page that walks through:

1. **Step 1: Install PWA** — "Add to Home Screen" instructions for iOS Safari and Android Chrome
2. **Step 2: Enable Notifications** — Permission prompt with explanation
3. **Step 3: iPhone Focus Modes** — Step-by-step screenshots for creating the 4 Focus Modes
4. **Step 4: iPhone Shortcuts** — Downloadable shortcut links or manual creation guide
5. **Step 5: Screen Time Limits** — Instagram 20 min, YouTube 30 min setup
6. **Step 6: Android Digital Wellbeing** — Focus Mode + App Timer setup
7. **Step 7: Desktop Browser** — LeechBlock NG installation + config import
8. **Step 8: Verify** — Checklist to confirm everything is working

This setup page is **TICKET-017** in the build plan.

---

## New Tickets to Add

### TICKET-017: Setup Wizard Page
**Phase:** 1.5 (right after Phase 1 MVP)
- `/setup` route with step-by-step device setup guide
- Platform detection (iOS vs Android vs Desktop)
- Shows only relevant steps per platform
- Checklist with completion tracking
- Include screenshots/illustrations for each step

### TICKET-018: Device Check-in Webhook
**Phase:** 2
- `POST /api/device/checkin` endpoint
- Accepts focus mode name + timestamp from iOS Shortcuts
- Tracks daily Focus Mode compliance
- Feeds into weekly report

### TICKET-019: Progress Dashboard (Enhanced)
**Phase:** 2
- GitHub-style yearly heatmap
- Streak flame chart
- Focus hours stacked area chart
- XP progress curve with rank milestones
- Monthly trend comparisons

### TICKET-020: XP & Rank System
**Phase:** 2
- XP calculation service
- Rank determination logic
- Level-up notifications
- Rank badge in sidebar
- XP breakdown in weekly report
