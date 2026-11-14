# DAWAH X — Website

A Bengali Islamic dawah website: Q&A library, fatwa archive (≈19,000 searchable references), a 5,000‑video YouTube gallery, and a form where visitors send their questions to the DAWAH X team.

Live at **https://dawah-x.github.io/ead/** — served by **GitHub Pages** from the `main` branch, repository root. There is no build step.

## Key technologies
- Plain static HTML, CSS and JavaScript (no build step), published from the repository root
- All local assets use **relative URLs**, so the site works from a subpath (e.g. GitHub Pages project sites) and any static host
- **Question delivery via Messenger** — no backend required; see below
- Long‑lived cache for hashed assets via GitHub Pages' default caching (assets are content‑hashed so renamed files bust the cache)

## How questions reach your Messenger
There is no server. When a visitor presses **প্রশ্ন পাঠান (Send question)** on any page:

1. The question — plus optional name, contact and topic — is formatted as a ready‑to‑send message.
2. That message is **copied to the visitor's clipboard** and **Messenger opened at `https://m.me/61595349861689`** in a new tab.
3. The visitor presses **Paste** and **Send** in Messenger; the question arrives in your DAWAH X Messenger chat.

The visitor's name/contact/topic are included in the copied message, so pasted questions carry everything you need. If the browser blocks clipboard access, the page shows the full message in a copyable box instead. Automatic delivery without the visitor pressing Send would require Meta's Messenger API and a backend — not used here to keep the site fully static.

## Run locally
```bash
python3 -m http.server 8889
```
Then open http://localhost:8889 (any static server works).

## Structure
- `*.html` — one file per page (index, about, services, questions, fatwa, videos, ask, contact); `404.html` is the custom not‑found page GitHub Pages serves automatically
- `robots.txt`, `sitemap.xml` — crawler hints (sitemap lists the 8 public pages)
- `assets/` — shared CSS and JS used by every page (content‑hashed names; rename to the file's new SHA‑1 prefix after editing and update references)
- `img/` — shared images extracted from the pages
- `*-catalog-part-*.js`, `youtube-videos.json` — library and video data, loaded on demand
- `site-notes.md`, `youtube-setup.md` — original notes on the library and video catalogue
