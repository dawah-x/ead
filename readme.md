# DAWAH X — Website

A Bengali Islamic dawah website: Q&A library, fatwa archive (≈19,000 searchable references), a 5,000‑video YouTube gallery, and a form where visitors send their questions to the DAWAH X team.

## Key technologies
- Plain static HTML, CSS and JavaScript (no build step), published from the repository root
- **Netlify Forms** — stores every question sent from the "প্রশ্ন করুন" form
- **Netlify Image CDN** — serves the hero image as compressed WebP
- Long‑lived cache headers for hashed assets (`netlify.toml`)

## Seeing submitted questions
Netlify dashboard → this project → **Forms** → `question`. Each entry shows name, contact, topic and the question.
To get an email for every new question: **Project configuration → Notifications → Emails and webhooks → Form submission notifications → Add notification → Email**.

## Run locally
```bash
netlify dev --port 8889
```
Then open http://localhost:8889. (Any static server works for browsing; form submissions need Netlify.)

## Structure
- `*.html` — one file per page (index, about, services, questions, fatwa, videos, ask, contact)
- `assets/` — shared CSS and JS used by every page (content-hashed names)
- `img/` — shared images extracted from the pages
- `*-catalog-part-*.js`, `youtube-videos.json` — library and video data, loaded on demand
- `__forms.html` — hidden form definition that registers the question form with Netlify
- `SITE-NOTES.md`, `YOUTUBE-SETUP.md` — original notes on the library and video catalogue
