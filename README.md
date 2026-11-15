# DAWAH X — Website

A Bengali Islamic dawah website: Q&A library, fatwa archive (≈19,000 searchable references), a 5,000‑video YouTube gallery, and a form where visitors send their questions to the DAWAH X team.

Live at **https://dawah-x.github.io/ead/** — served by **GitHub Pages** from the `main` branch, repository root. There is no build step.

## Key technologies
- Plain static HTML, CSS and JavaScript (no build step), published from the repository root
- All local assets use **relative URLs**, so the site works from a subpath (e.g. GitHub Pages project sites) and any static host
- **Question delivery via Messenger** — no backend required; see below
- Long‑lived cache for hashed assets via GitHub Pages' default caching (assets are content‑hashed so renamed files bust the cache)

## How questions reach you
There is no server. On any page, visitors can reach the DAWAH X team two ways:

**Option 1 — Messenger ("প্রশ্ন পাঠান")**
1. The question — plus optional name, contact and topic — is formatted as a ready‑to‑send message.
2. That message is **copied to the visitor's clipboard** and **Messenger opened at `https://m.me/61595349861689`** in a new tab.
3. The visitor presses **Paste** and **Send** in Messenger; the question arrives in your DAWAH X Messenger chat.

If the browser blocks clipboard access, the page shows the full message in a copyable box instead.

**Option 2 — WhatsApp ("WhatsApp-এ পাঠান")**
The button opens `https://wa.me/8801783543026` in a new tab with the same composed question **pre-filled in the chat box**. The visitor just presses Send in WhatsApp — no clipboard step needed.

WhatsApp (`https://wa.me/8801783543026`) also appears as a contact card on the যোগাযোগ section, a footer icon, the footer follow buttons, and a floating action button on every page.

Automatic delivery without any visitor action would require Meta's Messenger API / WhatsApp Cloud API and a backend — deliberately not used to keep the site fully static.

## Run locally
```bash
python3 -m http.server 8889
```
Then open http://localhost:8889 (any static server works).

## Installable mobile app (PWA)
The site is also an installable app — open it in a mobile browser and use **Add to Home Screen** (or the **ইনস্টল** button inside the **আরও** sheet). Installed, it opens full-screen without browser chrome and keeps working offline.

- `app/app.css`, `app/app.js` — mobile app shell: bottom tab bar (হোম · প্রশ্নোত্তর · ফতোয়া · ভিডিও · আরও), a "সব বিভাগ" bottom sheet, install flow and offline/update toasts. Desktop layout is unchanged.
- `sw.js` — service worker: network-first for pages and app files, stale-while-revalidate for hashed assets, and a cached fallback for offline navigation. The large `*-catalog-part-*.js` files and `youtube-videos.json` are fetched normally and are not precached.
- `offline.html` — offline fallback page, cached by the service worker.
- `app/icon-maskable-*.png` — maskable launcher icons referenced by `site.webmanifest`.

## In-site answers
Q&A and fatwa cards open `answers.html` instead of leaving the site. The reader looks up the exact question title in `app/answers.json`, renders the Bengali summary, sections, references, source credit and disclaimer, and offers share/copy plus a pre-filled WhatsApp question. Curated answers live under `qa` and `fatwa`; shortened fatwa titles used by the featured list map to the full originals through `aliases`. When a title has no written answer yet, the page says so honestly, keeps the visitor on-site and offers WhatsApp follow-up (`app/answers.js`). `answers.html` is marked `noindex, follow` and is not part of the eight-page shell template.

The shell is progressive: without JavaScript the pages and their normal navigation still work.

## Structure
- `*.html` — one file per page (index, about, services, questions, fatwa, videos, ask, contact); `answers.html` is the in-site answer reader; `404.html` is the custom not‑found page GitHub Pages serves automatically
- `robots.txt`, `sitemap.xml` — crawler hints (sitemap lists the 8 public pages)
- `assets/` — shared CSS and JS used by every page (content‑hashed names; rename to the file's new SHA‑1 prefix after editing and update references)
- `app/` — mobile app shell (tab bar, bottom sheet, install UI, maskable icons), answer reader script (`answers.js`) and Bengali answer library (`answers.json`)
- `sw.js`, `offline.html` — offline caching and fallback for the installable app
- `site.webmanifest`, `img/….png` icons — installable PWA metadata (Android/Chrome "Add to Home Screen"), icon set and app shortcuts
- `scripts/check_links.py` — network‑free static checks (internal links, in‑page fragments, JSON‑LD, sitemap, manifest); runs in CI via `.github/workflows/quality.yml`
- `img/` — shared images extracted from the pages; hero is served as WebP with a JPEG fallback via `image-set()`
- `*-catalog-part-*.js`, `youtube-videos.json` — library and video data, loaded on demand
- `site-notes.md`, `youtube-setup.md` — original notes on the library and video catalogue
