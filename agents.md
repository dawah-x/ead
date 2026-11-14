# AGENTS.md — DAWAH X

## Architecture
Static site, no build step; published by **GitHub Pages** from the `main` branch, repository root (live at `https://dawah-x.github.io/ead/`). Every page file contains the same full markup (all sections); `<body data-page="…">` and CSS decide which section is visible. Treat the pages as copies of one template — a markup change usually has to be applied to all eight `.html` files.

## Key directories / files
- `assets/<hash>.css` — the single shared stylesheet. The last block ("Smoothness pass") holds performance overrides; keep heavy effects (full-page animated backgrounds, large blurs, mix-blend overlays, blanket `will-change`, backdrop-filter on mobile) out.
- `assets/<hash>.js` — shared scripts, minified with terser. The large app script has three variants (default, fatwa page, questions page); the small effects script is shared by all pages. Top-level names in the app script are NOT mangled (inline scripts rely on `FC`, `FT`, `fdraw`, `qdraw`, `qshow`, `fshow`, …).
- `img/<hash>.*` — images that were originally inlined as base64.
- `youtube-gallery.js` — renders the static 5,000‑video catalogue; loads `youtube-videos.json` on demand (no `no-cache`; normal HTTP caching applies).
- `404.html`, `robots.txt`, `sitemap.xml` — custom GitHub Pages 404, crawler rules and sitemap (sitemap URLs point at the GitHub Pages project URL).

## How questions reach Messenger (no backend)
The ask form does not submit anywhere. On "প্রশ্ন পাঠান", the app script formats the question plus optional name/contact/topic, **copies it to the clipboard**, and opens `https://m.me/61595349861689`. The visitor pastes and sends in Messenger. If clipboard access fails, the page shows the message in a copyable `<textarea>`. There is deliberately no server, no database and no `__forms.html` — keep it that way unless a backend is introduced.

## Conventions / non-obvious decisions
- Asset names are content hashes (SHA‑1, first 10 hex chars). If you edit a file in `assets/` or `img/`, rename it (new hash) and update references in every `.html`, otherwise browsers keep the old copy.
- All local URLs are **relative** (`assets/…`, `img/…`, `index.html`, …) so the site works from a subpath on GitHub Pages and any static host. Only canonical/og URLs and the sitemap reference the absolute `https://dawah-x.github.io/ead/` origin.
- Do not re-inline images or CSS into pages; that was the main cause of slow loads (~335 KB → ~30 KB per page).
- UI copy is Bengali; keep it that way.
- Element globals (e.g. `askbtn`, `aq`, `askm`) are referenced by id directly in the app script.
- `netlify.toml` and Netlify Forms were removed — the site does not use Netlify.
