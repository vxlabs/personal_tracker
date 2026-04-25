# Product Context — Protocol App

## What It Is
**Protocol** is a personal discipline enforcement system for a single user (Sadique). It combines:
- A visual weekly schedule with "what should I be doing NOW?" awareness
- Habit tracking with streaks and bitmask-based applicable days
- Focus mode with site blocking awareness
- Push notifications for schedule transitions
- A personal knowledge wiki powered by AI compilation
- An XP/rank gamification system for motivation
- A desktop widget for always-visible schedule awareness
- Full PWA for mobile access

## What It Is NOT
- Not a generic productivity app
- Not multi-user or multi-tenant
- No authentication needed (single user)
- No over-engineering — simplicity is a feature

## Core Problem
Maintaining a strict daily routine across study (ML), content creation, work, exercise, and personal time requires constant awareness of "what should I be doing RIGHT NOW?" and accountability for habits. Additionally, a growing body of knowledge from articles, papers, and notes needs to be organized into a searchable personal wiki.

## Aesthetic
Dark military terminal / cyberpunk. Near-black backgrounds, neon accents (purple, cyan), monospace typography. Think "terminal meets discipline tracker."

## Key Features

### NOW Card (Killer Feature)
A large, impossible-to-ignore card showing what you should be doing, how long until the next block, and your habit completion for today. This is the first thing seen when opening the app.

### Desktop Widget
An always-on-top transparent widget on the desktop showing the current schedule block, time remaining, and habit status. Compact mode (single line) and expanded mode (full view). Auto-hides during rest blocks.

### Wiki / Knowledge Vault
Capture URLs and notes → AI extracts and converts to markdown → AI compiles into structured wiki pages (entities, concepts, topics, syntheses) → full-text search + AI-powered Q&A → knowledge graph visualization. The vault lives on-disk as markdown files; the database stores only an index.

### XP / Gamification
Everything earns XP: habits (+10), perfect days (+50), streak milestones (+100/200/500), focus sessions (+5/30min), wiki captures (+15), wiki compilation (+30), daily reviews (+20). Military ranks from Recruit (0 XP) to General (12,000 XP).

## User
Single user: Sadique. Based in IST (UTC+5:30). All time calculations use Indian Standard Time.

## Habits Tracked
1. Active Recall after study/reading (🧠)
2. No IG outside breakfast + dinner (📵)
3. 1 screen, 1 task — no shows while working (🖥️)
4. Lunch walk, no screens (🚶)
5. Lights out by 11:15 PM (🌙)
6. 2-min mental day review (📝)

## Schedule Structure
- Mon/Wed/Fri: Football mornings + ML study + content/work
- Tue/Thu: Gym mornings + video shoot + ML + work
- Saturday: Gym + pet projects + free time
- Sunday: Full rest day (only sleep habit applies)

## Deployment Modes
1. **Web (PWA)**: Frontend served by Vite dev server or Nginx, API at localhost:5000
2. **Docker**: docker-compose with both services
3. **Desktop (Electron)**: Electron shell with embedded .NET API, widget overlay, tray icon
4. **Mobile**: PWA installable with offline support and background sync
