#!/usr/bin/env python3
"""Static sanity checks for the DAWAH X site.

No network access required. Verifies:
  1. Every local href/src/action target in every HTML page exists on disk.
  2. Every in-page #fragment link points at an id that exists in the same page.
  3. Every inline JSON-LD <script type="application/ld+json"> block parses as JSON.
  4. sitemap.xml URLs map to files that exist and use the production origin.
  5. site.webmanifest parses and its icon files exist.

External URLs (http/https hosts) are not fetched; they are reported as counts.
Exit code is 1 if any problem is found.
"""

import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlparse

ROOT = Path(__file__).resolve().parent.parent
ORIGIN = "https://dawah-x.github.io/ead/"
HTML_FILES = sorted(p for p in ROOT.glob("*.html") if p.is_file())

errors = []
external = 0


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.attrs = []          # (attr, value, lineno)
        self.ids = set()
        self.ldjson = []         # raw JSON-LD payloads
        self._in_ldjson = False
        self._ld_buf = []
        self.symbol_refs = []    # (id, lineno) from <use href="#id">

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if "id" in a:
            self.ids.add(a["id"])
        if tag == "script" and (a.get("type") or "").lower() == "application/ld+json":
            self._in_ldjson = True
            self._ld_buf = []
        for key in ("href", "src", "action"):
            v = a.get(key)
            if v:
                self.attrs.append((key, v, self.getpos()[0]))
        for ref in (a.get("href"), a.get("xlink:href")):
            if tag == "use" and ref and ref.startswith("#"):
                self.symbol_refs.append((ref[1:], self.getpos()[0]))
        if tag == "symbol" and a.get("id"):
            self.ids.add(a["id"])

    def handle_endtag(self, tag):
        if tag == "script" and self._in_ldjson:
            self._in_ldjson = False
            self.ldjson.append("".join(self._ld_buf))

    def handle_data(self, data):
        if self._in_ldjson:
            self._ld_buf.append(data)


def local_target_ok(page: Path, target: str):
    """Resolve a relative link target against the page; return error or None."""
    path = unquote(target.split("#")[0].split("?")[0])
    if not path:
        return None  # pure query/fragment
    candidate = (page.parent / path).resolve()
    try:
        candidate.relative_to(ROOT)
    except ValueError:
        return f"link escapes repo root: {target!r}"
    if target.endswith("/"):
        return None if candidate.is_dir() else f"missing directory: {target!r}"
    return None if candidate.exists() else f"missing file: {target!r}"


for page in HTML_FILES:
    parser = PageParser()
    parser.feed(page.read_text(encoding="utf-8"))
    rel = page.relative_to(ROOT)

    for key, value, lineno in parser.attrs:
        v = value.strip()
        if not v:
            continue
        if v.startswith(("http://", "https://", "mailto:", "tel:", "sms:", "ftp:")):
            external += 1
            continue
        if v.startswith("data:"):
            continue
        if v.startswith("#"):
            frag = v[1:]
            if frag and frag not in parser.ids:
                errors.append(f"{rel}:{lineno}: fragment #{frag!r} has no matching id")
            continue
        if v.startswith("/"):
            errors.append(f"{rel}:{lineno}: root-absolute URL {v!r} breaks the /ead/ subpath deploy")
            continue
        problem = local_target_ok(page, v)
        if problem:
            errors.append(f"{rel}:{lineno}: {problem}")

    for sym, lineno in parser.symbol_refs:
        if sym not in parser.ids:
            errors.append(f"{rel}:{lineno}: <use href=\"#{sym}\"> has no matching symbol")

    for i, payload in enumerate(parser.ldjson, 1):
        try:
            json.loads(payload)
        except json.JSONDecodeError as exc:
            errors.append(f"{rel}: JSON-LD block {i} is invalid JSON: {exc}")

# --- sitemap.xml maps to real files under the production origin
sitemap = ROOT / "sitemap.xml"
if sitemap.exists():
    tree = ET.parse(sitemap)
    ns = {"sm": "http://www.sitemaps.org/schemas/sitemap/0.9"}
    for url in tree.getroot().findall("sm:url/sm:loc", ns):
        loc = (url.text or "").strip()
        if not loc.startswith(ORIGIN):
            errors.append(f"sitemap.xml: URL outside production origin: {loc!r}")
            continue
        path = unquote(urlparse(loc).path)
        local = ROOT / path[len("/ead/"):]
        if not local.exists():
            errors.append(f"sitemap.xml: URL maps to missing file: {loc!r}")

# --- manifest parses and icon files exist
manifest_path = ROOT / "site.webmanifest"
if manifest_path.exists():
    try:
        manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
        for icon in manifest.get("icons", []):
            icon_file = ROOT / icon["src"]
            if not icon_file.exists():
                errors.append(f"site.webmanifest: missing icon file {icon['src']!r}")
    except json.JSONDecodeError as exc:
        errors.append(f"site.webmanifest: invalid JSON: {exc}")

# --- report
print(f"Checked {len(HTML_FILES)} HTML pages; {external} external URLs (not fetched).")
if errors:
    print(f"\n{len(errors)} problem(s) found:")
    for e in errors:
        print(" -", e)
    sys.exit(1)
print("All internal links, fragments, JSON-LD, sitemap and manifest checks passed.")
