# AGENTS.md — DAWAH X

## Architecture
Static site, no build step; `netlify.toml` publishes the repo root. Every page file contains the same full markup (all sections); `<body data-page="…">` and CSS decide which section is visible. Treat the pages as copies of one template — a markup change usually has to be applied to all eight `.html` files.

## Key directories / files
- `assets/<hash>.css` — the single shared stylesheet. The last block ("Smoothness pass") holds performance overrides; keep heavy effects (full-page animated backgrounds, large blurs, mix-blend overlays, blanket `will-change`, backdrop-filter on mobile) out.
- `assets/<hash>.js` — shared scripts. The large app script has three variants (default, fatwa page, questions page); the small effects script is shared by all pages.
- `img/<hash>.*` — images that were originally inlined as base64.
- `__forms.html` — Netlify Forms registration for form `question` (fields: name, contact, topic, question, bot-field). Visible forms post to `/__forms.html` via `fetch` with `application/x-www-form-urlencoded`.

## Conventions / non-obvious decisions
- Asset names are content hashes and served `immutable`. If you edit a file in `assets/` or `img/`, rename it (new hash) and update references in every `.html`, otherwise browsers keep the old copy.
- Do not re-inline images or CSS into pages; that was the main cause of slow loads (~335 KB → ~30 KB per page).
- UI copy is Bengali; keep it that way.
- Element globals (e.g. `askbtn`, `aq`, `askm`) are referenced by id directly in the app script.
