# AGENTS.md — DAWAH X

## Architecture
Static site, no build step; published by **GitHub Pages** from the `main` branch, repository root (live at `https://dawah-x.github.io/ead/`). Every page file contains the same full markup (all sections); `<body data-page="…">` and CSS decide which section is visible. Treat the pages as copies of one template — a markup change usually has to be applied to all eight `.html` files.

The site is also an installable PWA. `app/app.css` and `app/app.js` add a mobile bottom tab bar, a **সব বিভাগ** bottom sheet, the install flow and status toasts on screens ≤900px; desktop keeps the normal header nav. `sw.js` precaches the pages, the app shell and the hashed assets, and `offline.html` is the navigation fallback. The same tab-bar/sheet markup is duplicated in all eight pages, so update every page together. `answers.html` is a separate reader page built from the same header/footer shell but with none of the page sections; it is not part of the eight-page duplication.

## Key directories / files
- `assets/<hash>.css` — the single shared stylesheet. The last block ("Smoothness pass") holds performance overrides; keep heavy effects (full-page animated backgrounds, large blurs, mix-blend overlays, blanket `will-change`, backdrop-filter on mobile) out.
- `assets/<hash>.js` — shared scripts, minified with terser. One app script is shared by **all eight pages** (the former page-specific copies `96b3c6b145.js` / `fd074a3ac1.js` were unified into a single file); the small effects script is shared by all pages. Top-level names in the app script are NOT mangled (inline scripts rely on `FC`, `FT`, `fdraw`, `qdraw`, `qshow`, `fshow`, …). The catalog arrays `QS`/`QC`/`FT`/`FC` must stay `var` (not `const`) because the inline catalog scripts on `questions.html` and `fatwa.html` reassign them.
- `app/app.css`, `app/app.js` — mobile app shell and install/offline UI; `sw.js` + `offline.html` — service worker and offline fallback
- `answers.html`, `app/answers.js`, `app/answers.json` — in-site answer reader. Cards link to `answers.html?type=qa|fatwa&q=<title>`; the reader resolves shortened fatwa titles through `aliases` and falls back to an honest "answer being prepared" state plus WhatsApp CTA. Keep the JSON keys byte-identical to the catalog titles.
- `img/<hash>.*` — images that were originally inlined as base64.
- `youtube-gallery.js` — renders the static 5,000‑video catalogue; loads `youtube-videos.json` on demand (no `no-cache`; normal HTTP caching applies).
- `404.html`, `robots.txt`, `sitemap.xml` — custom GitHub Pages 404, crawler rules and sitemap (sitemap URLs point at the GitHub Pages project URL).

## How questions reach you (no backend)
The ask form does not submit anywhere. Two buttons, same composed message (question + optional name/contact/topic):
- **"WhatsApp-এ পাঠান"** (`#wabtn`, primary) — opens `https://wa.me/8801783543026?text=<url-encoded message>` through a temporary anchor; the question arrives pre-filled in WhatsApp, visitor just presses Send. The status line (`#askm`, `role="status"`) shows the opening/success state and always includes a direct WhatsApp fallback link. If the popup is blocked, the message is copied to the clipboard.
- **"Messenger-এ পাঠান"** (`#askbtn`) — **copies the message to the clipboard** and opens `https://m.me/61595349861689`; the visitor pastes and sends in Messenger. If clipboard access fails, the page shows the message in a copyable `<textarea>`.

`wa.me/8801783543026` is the owner's WhatsApp (same number as the `tel:` link, `+8801783543026`). It also appears as the `.ccard-wa` contact card, a footer icon, the footer follow buttons, and a `.wa-float` floating button. There is deliberately no server, no database and no `__forms.html` — keep it that way unless a backend is introduced.

## Conventions / non-obvious decisions
- Asset names are content hashes (SHA‑1, first 10 hex chars). If you edit a file in `assets/` or `img/`, rename it (new hash) and update references in every `.html`, otherwise browsers keep the old copy.
- All local URLs are **relative** (`assets/…`, `img/…`, `index.html`, …) so the site works from a subpath on GitHub Pages and any static host. Only canonical/og URLs and the sitemap reference the absolute `https://dawah-x.github.io/ead/` origin.
- Do not re-inline images or CSS into pages; that was the main cause of slow loads (~335 KB → ~30 KB per page).
- UI copy is Bengali; keep it that way.
- Element globals (e.g. `askbtn`, `aq`, `askm`) are referenced by id directly in the app script.
- `netlify.toml` and Netlify Forms were removed — the site does not use Netlify.
- Run `python3 scripts/check_links.py` before pushing; the same check runs in GitHub Actions (`.github/workflows/quality.yml`) on pushes to `main` and on PRs. The footer subscribe placeholder was replaced with honest follow buttons (WhatsApp / Messenger / Facebook Page) — do not re-add a fake subscribe form without a real backend.
