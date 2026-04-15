# Browser Extensions

Protocol ships two browser extensions that share the same logic in separate manifests:

| Extension | Folder | Manifest |
|---|---|---|
| Chrome / Edge | `extension/` | Manifest V3 |
| Firefox | `extension-firefox/` | Manifest V2 |

---

## What the Extension Does

- Polls `GET /api/schedule/now` every 60 seconds
- Updates the toolbar icon badge with minutes remaining in the current block
- Changes the icon color based on block type (red = focus, cyan = research, grey = rest/off)
- During focus blocks: intercepts navigation to configured blocked domains, redirects to the "NOT NOW" page
- Logs blocked attempts to `POST /api/focus/blocked-attempt` for the weekly report

---

## Files

| File | Purpose |
|---|---|
| `manifest.json` | Permissions, content scripts, background registration |
| `background.js` | Schedule sync, blocking logic, badge/icon updates |
| `content.js` | Injected into pages (future: knowledge clipper) |
| `blocked.html` | "NOT NOW" redirect page |
| `blocked.js` | Countdown and block info on the redirect page |
| `popup.html / popup.js` | Toolbar popup showing current block |

---

## Chrome / Edge — Local Install

No signing required. Load the extension as unpacked:

1. Open `chrome://extensions`
2. Enable **Developer mode** (toggle, top-right)
3. Click **Load unpacked**
4. Select the `extension/` folder from the repo
5. Pin the Protocol icon in your toolbar

The extension persists across browser restarts automatically.

---

## Firefox — Signed Install (Personal Use)

Firefox requires all extensions to be signed. Use Mozilla AMO's **unlisted channel** — it is free and the extension will not be publicly listed.

### One-time setup

1. Install the signing CLI:
   ```bash
   npm install -g web-ext
   ```

2. Generate AMO API credentials:
   - Visit `https://addons.mozilla.org/developers/addon/api/key/`
   - Log in with a free Firefox account
   - Generate a **JWT issuer** and **JWT secret**

### Sign the extension

```bash
cd extension-firefox
web-ext sign \
  --api-key=YOUR_JWT_ISSUER \
  --api-secret=YOUR_JWT_SECRET \
  --channel=unlisted
```

This outputs a `.xpi` file in `extension-firefox/web-ext-artifacts/`.

### Install in Firefox

1. Open Firefox → `about:addons`
2. Gear icon → **Install Add-on From File...**
3. Select the `.xpi` file
4. Confirm the permission prompt

The extension is now permanently installed and survives restarts.

---

## Firefox — Unsigned Install (Developer Edition / Nightly Only)

Standard Firefox releases require signing. This method only works on Firefox Developer Edition or Firefox Nightly:

1. `about:config` → set `xpinstall.signatures.required` to `false`
2. `about:debugging` → **This Firefox** → **Load Temporary Add-on**
3. Select `extension-firefox/manifest.json`

> Temporary add-ons are removed on browser restart. This is fine for development.

---

## Configuring the API URL

By default both extensions connect to `http://localhost:5000/api`. When the backend is deployed to a remote server, update the base URL before loading/signing:

**`extension/background.js` — line 1:**
```js
const API_BASE = 'https://your-api-domain.com/api';
```

**`extension-firefox/background.js` — line 1:**
```js
const API_BASE = 'https://your-api-domain.com/api';
```

Also update the host permissions in each manifest:

**`extension/manifest.json`:**
```json
"host_permissions": [
  "https://your-api-domain.com/*",
  "<all_urls>"
]
```

**`extension-firefox/manifest.json`:**
```json
"permissions": [
  "storage", "alarms", "tabs",
  "https://your-api-domain.com/*",
  "<all_urls>"
]
```

The backend must include CORS origins for `chrome-extension://` and `moz-extension://`.

---

## Blocked Sites Management

Add or remove blocked domains from:
- **Settings page** in the Protocol web app (`/settings`)
- Directly via `POST /api/blocked-sites` with `{ "domain": "example.com" }`

Domains are fetched by the extension on each schedule sync. No extension reload required.

---

## Blocked Attempt Logging

When a user tries to navigate to a blocked domain during a focus block, the extension:
1. Redirects them to `blocked.html` with the block name and countdown
2. Posts to `POST /api/focus/blocked-attempt` — this data feeds the weekly report

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Badge not updating | Confirm backend is running on `:5000`. Check the extension background page console for errors. |
| Sites not being blocked | Confirm the domain is in `/api/blocked-sites` and `isActive: true`. Confirm the current block has `isFocusBlock: true`. |
| Firefox `.xpi` install rejected | Extension must be signed. Re-run `web-ext sign` or use Developer Edition. |
| CORS errors in extension | Add `chrome-extension://` and `moz-extension://` origins to the backend CORS policy. |
