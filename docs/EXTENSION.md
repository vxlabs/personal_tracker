# EXTENSION.md — Protocol Chrome Extension (Focus Blocker + Knowledge Clipper)

## Overview

One Chrome extension that does two things:
1. **Focus Blocker** — Blocks distracting sites during focus blocks (from TICKET-014)
2. **Knowledge Clipper** — One-click capture of any web page as clean markdown into the Knowledge Vault

These aren't two separate extensions. They're two modes of the same tool. During focus blocks, the extension enforces discipline. Outside focus blocks (or during content research), it captures knowledge. The extension icon changes color/mode based on your current schedule block.

---

## Architecture

```
extension/
├── manifest.json                  # Manifest V3
├── package.json
├── tsconfig.json
├── vite.config.ts                 # Build config
├── src/
│   ├── background/
│   │   ├── service-worker.ts      # Main background script
│   │   ├── schedule-sync.ts       # Polls Protocol API for current block
│   │   ├── blocker.ts             # URL interception + blocking logic
│   │   └── clipper-handler.ts     # Handles clip requests from popup/context menu
│   ├── content/
│   │   ├── extractor.ts           # Content extraction (Readability + Turndown)
│   │   ├── highlighter.ts         # Text selection highlighting
│   │   ├── twitter-extractor.ts   # Twitter/X specific extraction
│   │   ├── reddit-extractor.ts    # Reddit specific extraction
│   │   ├── youtube-extractor.ts   # YouTube transcript extraction
│   │   └── site-extractors.ts     # Registry of site-specific extractors
│   ├── popup/
│   │   ├── Popup.tsx              # Main popup UI
│   │   ├── FocusView.tsx          # Focus mode status + blocked sites
│   │   ├── ClipView.tsx           # Clipper UI — preview, tags, category, save
│   │   ├── QuickCapture.tsx       # Minimal capture (URL + title only)
│   │   └── popup.css
│   ├── blocked/
│   │   └── BlockedPage.tsx        # "NOT NOW" redirect page
│   ├── options/
│   │   ├── Options.tsx            # Extension settings
│   │   └── options.css
│   ├── utils/
│   │   ├── api-client.ts          # Protocol API communication
│   │   ├── markdown-converter.ts  # HTML → Markdown conversion
│   │   ├── readability.ts         # Mozilla Readability wrapper
│   │   ├── frontmatter.ts         # YAML frontmatter generation
│   │   └── storage.ts             # Chrome storage wrapper
│   └── types/
│       └── index.ts
├── lib/
│   ├── readability.js             # Mozilla Readability (bundled)
│   └── turndown.js                # HTML to Markdown converter (bundled)
├── assets/
│   ├── icons/
│   │   ├── icon-focus-16.png      # Red icon — focus mode active
│   │   ├── icon-focus-48.png
│   │   ├── icon-capture-16.png    # Cyan icon — capture mode
│   │   ├── icon-capture-48.png
│   │   ├── icon-idle-16.png       # Grey icon — rest/off
│   │   └── icon-idle-48.png
│   └── blocked-page/
│       └── styles.css
└── dist/                          # Build output
```

---

## Feature 1: Focus Blocker

### How it works

1. **Background service worker** polls `GET /api/schedule/now` every 60 seconds
2. Gets current block info: type, label, whether it's a focus block, remaining time
3. If current block has `focus: true`, blocker activates
4. Uses `chrome.declarativeNetRequest` to intercept navigation to blocked domains
5. Redirects to the built-in **BlockedPage** — a local HTML page showing:
   - "NOT NOW" in large text
   - Current block name and type (color-coded)
   - Time remaining in current block
   - Motivational message
   - "I understand, take me back" button

### Blocked domains management
- Default list loaded from `GET /api/focus/blocked-sites`
- User can add/remove from extension options
- Syncs with Protocol app settings
- Domain matching: blocks `*.instagram.com`, `*.reddit.com`, etc.

### Extension badge
- During focus blocks: Red badge with minutes remaining ("47m")
- During rest blocks: No badge, grey icon
- During content research blocks: Cyan icon (capture mode active)

### Blocked attempt logging
```typescript
// When a site is blocked, log it to Protocol API
POST /api/focus/blocked-attempt
{
  "domain": "instagram.com",
  "blockedAt": "2026-04-14T09:23:00+05:30",
  "currentBlock": "ML Study",
  "blockType": "ml"
}
```
This feeds into the weekly report — "You tried to visit Instagram 3 times during ML Study this week (down from 7 last week)."

---

## Feature 2: Knowledge Clipper

### Capture flows

**Flow 1: Popup clip (primary)**
1. User clicks extension icon (or keyboard shortcut: `Alt+Shift+K`)
2. Popup opens showing `ClipView`
3. Content script extracts page content using Readability
4. Popup shows:
   - **Title** (editable, pre-filled from page title)
   - **Content preview** (rendered markdown, scrollable)
   - **Tags** (auto-suggested from content + manual input)
   - **Category** dropdown (ai-research, ml-study, content-ideas, dotnet, general, etc.)
   - **Personal note** textarea ("why I'm saving this")
   - **Capture mode**: Full article | Selected text | URL only
   - **"Clip to Vault"** button
5. Sends to `POST /api/vault/capture` with extracted markdown

**Flow 2: Right-click context menu**
- Right-click on page → "Clip to Protocol Vault"
- Right-click on selected text → "Clip selection to Vault"
- Right-click on link → "Clip linked page to Vault"
- These use QuickCapture (minimal UI) — just captures with auto-detected metadata

**Flow 3: Keyboard shortcut**
- `Alt+Shift+K` — Open clipper popup
- `Alt+Shift+S` — Quick save (captures with defaults, no popup)

### Content extraction pipeline

```typescript
// Main extraction flow
async function extractContent(tab: chrome.tabs.Tab): Promise<ClipContent> {
  // 1. Detect site type
  const siteType = detectSiteType(tab.url);
  
  // 2. Use site-specific extractor if available
  if (siteType !== 'generic') {
    return await siteExtractors[siteType].extract(tab);
  }
  
  // 3. Otherwise use Readability for generic pages
  const article = await extractWithReadability(tab);
  
  // 4. Convert HTML to Markdown
  const markdown = convertToMarkdown(article.content);
  
  // 5. Generate frontmatter
  const frontmatter = generateFrontmatter({
    title: article.title,
    url: tab.url,
    author: article.byline,
    publishedDate: article.publishedTime,
    capturedAt: new Date().toISOString(),
    sourceType: siteType,
    wordCount: article.textContent.split(/\s+/).length,
    readingTime: Math.ceil(article.textContent.split(/\s+/).length / 200),
  });
  
  return { frontmatter, markdown, title: article.title };
}
```

### Site-specific extractors

| Site | Extractor | What it captures |
|------|-----------|-----------------|
| **Twitter/X** | `twitter-extractor.ts` | Tweet text, author, date, thread (if multi-tweet), quote tweets, media descriptions, engagement metrics |
| **Reddit** | `reddit-extractor.ts` | Post title, body, subreddit, top 10 comments (by score), author, flair |
| **YouTube** | `youtube-extractor.ts` | Title, channel, description, transcript (from captions API), chapters if available |
| **GitHub** | Readability + repo detection | README content, repo description, stars, language |
| **Hacker News** | Custom | Story + top comments |
| **Medium/Substack** | Readability (works well) | Full article with images referenced |
| **ArXiv** | Custom | Abstract, authors, PDF link, category |
| **Generic blog/article** | Readability + Turndown | Main article content, cleaned of nav/ads/footers |

### Twitter/X extractor detail

Twitter is tricky because of JavaScript rendering. The extractor works in two modes:

**Mode A: Single tweet capture (from tweet page)**
```typescript
// Content script injected into twitter.com/x.com
function extractTweet(): TweetData {
  // Find the main tweet article element
  const tweetArticle = document.querySelector('article[data-testid="tweet"]');
  
  return {
    author: extractAuthor(tweetArticle),
    handle: extractHandle(tweetArticle),
    text: extractTweetText(tweetArticle),
    date: extractDate(tweetArticle),
    media: extractMedia(tweetArticle),          // images, videos
    quoteTweet: extractQuoteTweet(tweetArticle),
    metrics: extractMetrics(tweetArticle),       // likes, retweets, views
    thread: extractThread(),                      // if it's a thread, get all tweets
  };
}
```

**Mode B: Thread capture**
- Detects if the tweet is part of a thread (same author, connected)
- Captures all tweets in order
- Output format:

```markdown
---
source_url: https://x.com/karpathy/status/2039805659525644595
source_type: twitter
author: Andrej Karpathy (@karpathy)
captured_at: 2026-04-14T10:30:00+05:30
tweet_date: 2026-04-03
metrics: { likes: 45000, retweets: 8200, views: 19000000 }
tags: [ai, knowledge-management, llm-wiki]
---

# LLM Knowledge Bases — @karpathy

**Thread (3 tweets):**

**1/3:** Something I'm finding very useful recently: using LLMs to build 
personal knowledge bases for various topics of research interest. In this 
way, a large fraction of my recent token throughput is going less into 
manipulating code, and more into manipulating knowledge...

**2/3:** Data ingest: I index source documents (articles, papers, repos, 
datasets, images, etc.) into a raw/ directory, then I use an LLM to 
incrementally "compile" a wiki...

**3/3:** The wiki includes summaries of all the data in raw/, backlinks, 
and then it categorizes data...
```

### Reddit extractor detail

```markdown
---
source_url: https://reddit.com/r/MachineLearning/comments/...
source_type: reddit
subreddit: r/MachineLearning
author: u/researcher42
captured_at: 2026-04-14T11:00:00+05:30
post_date: 2026-04-12
score: 847
comment_count: 234
tags: [ml, transformers, research]
---

# [Title of the Reddit post]

[Full post body in markdown]

---

## Top Comments

**u/commenter1** (score: 312):
> Comment text here...

**u/commenter2** (score: 198):
> Another comment...

[Top 10 comments by score]
```

### YouTube extractor detail

```markdown
---
source_url: https://youtube.com/watch?v=abc123
source_type: youtube
channel: 3Blue1Brown
captured_at: 2026-04-14T11:30:00+05:30
publish_date: 2026-04-01
duration: "23:45"
views: 1200000
tags: [ml, neural-networks, math, education]
---

# But what is a neural network? | Chapter 1, Deep Learning

**Channel:** 3Blue1Brown
**Duration:** 23:45
**Views:** 1.2M

## Description
[Video description text]

## Chapters
- 0:00 — Introduction
- 2:15 — What is a neuron?
- 8:30 — Layers and weights
- 15:00 — Training
- 20:00 — Summary

## Transcript

[00:00] Welcome to the first chapter of a series on neural networks...
[00:15] In this video, we're going to talk about what a neural network actually is...
[Full transcript with timestamps]
```

---

## Popup UI Design

The popup follows the Protocol dark theme:

```
┌─────────────────────────────────────┐
│  PROTOCOL CLIPPER          [⚙️] [×] │
│─────────────────────────────────────│
│                                     │
│  📎 Currently in: ML Study (47m)    │
│  ████████████░░░░░░  63% complete   │
│                                     │
│─────────────────────────────────────│
│                                     │
│  Title: ____________________________│
│  [LLM Knowledge Bases - @karpathy] │
│                                     │
│  ┌─ Preview ──────────────────────┐ │
│  │ Something I'm finding very     │ │
│  │ useful recently: using LLMs to │ │
│  │ build personal knowledge bases │ │
│  │ for various topics of research │ │
│  │ interest...                    │ │
│  └────────────────────────────────┘ │
│                                     │
│  Mode: [Full Page ▾]               │
│                                     │
│  Tags: [ai] [knowledge] [+]        │
│  Category: [AI Research ▾]          │
│                                     │
│  Note: ____________________________│
│  [Karpathy's approach to...]       │
│                                     │
│  ┌─────────────────────────────────┐│
│  │      📥 CLIP TO VAULT          ││
│  └─────────────────────────────────┘│
│                                     │
│  [Quick Save]  [Cancel]            │
└─────────────────────────────────────┘
```

- Width: 400px, Height: auto (max 600px)
- Dark background: #12121a
- Accent: cyan (#06b6d4) for capture mode, red for focus mode
- Current block indicator always visible at top
- If in focus mode and the current page is blocked, popup shows the block warning instead of clipper

---

## Extension Modes (based on schedule block)

| Current Block Type | Extension Icon | Popup Default View | Behavior |
|-------------------|---------------|-------------------|----------|
| Focus block (ML, Content, Reading, Work) | 🔴 Red + timer badge | FocusView (blocked sites + timer) | Blocks distracting sites. Clipper available but secondary |
| Content Research | 🟢 Cyan + "CLIP" badge | ClipView (clipper) | Clipper is primary. No blocking. |
| Rest / Breakfast + IG | ⚪ Grey | ClipView (clipper) | No blocking. Clipper available |
| Off day | ⚪ Grey, dimmed | ClipView (clipper) | No blocking. Everything open |

---

## API Integration

### Extension → Protocol API

```typescript
// api-client.ts
const API_BASE = 'http://localhost:5000/api'; // Configurable in options

// Schedule sync (every 60s)
GET /api/schedule/now
→ { currentBlock, nextBlock, minutesRemaining, percentComplete }

// Capture content
POST /api/vault/capture
→ { url, title, content, sourceType, tags, category, note, frontmatter }

// Log blocked attempt
POST /api/focus/blocked-attempt
→ { domain, blockedAt, currentBlock, blockType }

// Get blocked sites list
GET /api/focus/blocked-sites
→ ["instagram.com", "reddit.com", ...]

// Auto-compile after capture (optional setting)
POST /api/vault/compile/{sourceId}
```

### Authentication
- Since this is a single-user app running locally, no auth needed
- API base URL configurable in extension options (default: localhost:5000)
- For remote access (Mac Mini via Cloudflare Tunnel): support custom URL + optional API key header

---

## Build Tickets

### TICKET-E01: Extension Scaffolding
**Estimate:** 45 min
- Manifest V3 Chrome extension project with TypeScript + Vite
- Popup shell (React), options page, background service worker
- Bundle Readability.js and Turndown.js
- Icon set (3 states: focus, capture, idle)
- Build produces `dist/` folder loadable in Chrome

### TICKET-E02: Schedule Sync + Focus Blocker
**Estimate:** 1 hour
- `schedule-sync.ts` — polls Protocol API every 60 seconds
- `blocker.ts` — uses `chrome.declarativeNetRequest` for domain blocking
- Dynamic rule updates based on current block type
- `BlockedPage.tsx` — "NOT NOW" page with block info + countdown
- Badge: red with timer during focus blocks
- Log blocked attempts to API

### TICKET-E03: Generic Content Extractor
**Estimate:** 1 hour
- `extractor.ts` — Readability + Turndown pipeline
- Extracts: title, author, date, main content, images
- Converts to clean markdown with YAML frontmatter
- `frontmatter.ts` — generates standardized frontmatter
- Handle edge cases: paywalled content (extract what's visible), SPAs, empty pages

### TICKET-E04: Site-Specific Extractors
**Estimate:** 2 hours
- `twitter-extractor.ts` — single tweet + thread + quote tweet
- `reddit-extractor.ts` — post + top comments
- `youtube-extractor.ts` — metadata + transcript (via caption tracks)
- `site-extractors.ts` — registry with URL pattern matching
- Each extractor produces standardized markdown with rich frontmatter

### TICKET-E05: Clipper Popup UI
**Estimate:** 1.5 hours
- `Popup.tsx` — mode switching (focus/clip based on current block)
- `ClipView.tsx` — full clipper UI: title, preview, tags, category, note, modes
- `QuickCapture.tsx` — one-click minimal capture
- `FocusView.tsx` — focus block status + blocked sites + timer
- Preview renders extracted markdown
- Tags auto-suggestion from content keywords
- Send to `POST /api/vault/capture` on clip

### TICKET-E06: Context Menu + Keyboard Shortcuts
**Estimate:** 45 min
- Right-click menu: "Clip to Vault", "Clip selection", "Clip linked page"
- `Alt+Shift+K` — open clipper popup
- `Alt+Shift+S` — quick save (no popup)
- Context menu clips use QuickCapture flow
- Selected text capture: wraps selection in blockquote in the markdown

### TICKET-E07: Options Page + API Config
**Estimate:** 30 min
- `Options.tsx` — extension settings
- API base URL configuration
- Blocked sites list management (add/remove)
- Default category and tags
- Auto-compile toggle (compile immediately after capture)
- Keyboard shortcut display
- Export/import settings

---

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "latest",     // Only if doing local LLM summarization
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  },
  "devDependencies": {
    "@types/chrome": "latest",
    "@types/react": "latest",
    "typescript": "^5.4.0",
    "vite": "^5.0.0",
    "@crxjs/vite-plugin": "latest",    // Vite plugin for Chrome extensions
    "tailwindcss": "^3.4.0"
  },
  "bundled": {
    "readability": "Mozilla Readability (from @mozilla/readability)",
    "turndown": "HTML to Markdown converter",
    "turndown-plugin-gfm": "GitHub Flavored Markdown tables support"
  }
}
```

---

## Claude Code Prompts

### To start building the extension:
```
Read docs/EXTENSION.md completely. This is a Chrome extension module for the 
Protocol app. It combines a focus site blocker with a web content clipper for 
the Knowledge Vault.

Start with TICKET-E01: Extension scaffolding. Create a Manifest V3 Chrome 
extension with TypeScript, Vite, and React. Use @crxjs/vite-plugin for the 
build. Set up the popup, options page, background service worker, and content 
scripts. Bundle Mozilla Readability and Turndown.js.
```

### For the extractors:
```
Implement TICKET-E04: Site-specific extractors. Read the detailed extraction 
specs from EXTENSION.md for Twitter, Reddit, and YouTube. Each extractor should 
produce clean markdown with rich YAML frontmatter. The Twitter extractor must 
handle threads and quote tweets. The YouTube extractor must extract transcripts 
from caption tracks.
```

### For the clipper UI:
```
Implement TICKET-E05: Clipper popup UI. Follow the popup design mockup from 
EXTENSION.md. Dark theme matching Protocol app (DESIGN.md). The popup shows 
the current schedule block at top, then the clipper form with title, preview, 
tags, category, note. Preview should render the extracted markdown.
```
