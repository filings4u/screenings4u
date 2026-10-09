#!/usr/bin/env python3
"""Publish active Supabase page SEO metadata into GitHub Pages HTML source."""
import html
import json
import os
from pathlib import Path
import re
import sys
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
BASE = os.environ["SUPABASE_URL"].rstrip("/")
KEY = os.environ["SUPABASE_ANON_KEY"]
PAGE_URL = BASE + "/rest/v1/testing_published_page_settings?select=route,site_code,seo_title,seo_description,seo_index,canonical_url&site_code=eq.main&limit=1000"
TAG_TITLE = re.compile(r"<title\b[^>]*>.*?</title\s*>", re.I | re.S)
HEAD = re.compile(r"<head\b[^>]*>(.*?)</head\s*>", re.I | re.S)
def set_tag(s, kind, value, attr=None):
    escaped = html.escape(value, quote=True)
    if kind == "title":
        new = "<title>" + html.escape(value) + "</title>"
        return TAG_TITLE.sub(lambda _: new, s, count=1) if TAG_TITLE.search(s) else new + s
    if kind == "canonical":
        rx = re.compile(r'<link\b(?=[^>]*\brel\s*=\s*["\x27]?canonical(?:["\x27]|\s|>))[^>]*>', re.I)
        new = '<link rel="canonical" href="' + escaped + '">'
    else:
        rx = re.compile(r'<meta\b(?=[^>]*\bname\s*=\s*["\x27]?' + re.escape(kind) + r'(?:["\x27]|\s|>))[^>]*>', re.I)
        new = '<meta name="' + kind + '" content="' + escaped + '">'
    return rx.sub(lambda _: new, s, count=1) if rx.search(s) else new + s

def publish(page):
    route = page["route"]
    if not isinstance(route, str) or not route.startswith("/") or ".." in route or "?" in route or "#" in route:
        return False
    relative = "index.html" if route in ("/", "/index.html") else route.lstrip("/")
    if not relative.endswith(".html"):
        return False
    path = (ROOT / relative).resolve()
    if not path.is_relative_to(ROOT) or not path.is_file():
        print("SKIP missing source:", route)
        return False
    title = str(page.get("seo_title") or "").strip()
    description = str(page.get("seo_description") or "").strip()
    canonical = str(page.get("canonical_url") or "").strip()
    if len(title) > 200 or len(description) > 400:
        raise ValueError("Unreasonably long SEO metadata for " + route)
    if canonical:
        url = urllib.parse.urlsplit(canonical)
        if url.scheme != "https" or url.hostname not in ("screenings4u.com", "www.screenings4u.com"):
            raise ValueError("Invalid canonical for " + route)
    original = path.read_text(encoding="utf-8")
    match = HEAD.search(original)
    if not match:
        print("SKIP no head:", route)
        return False
    oldhead = match.group(1)
    newhead = oldhead
    if title:
        newhead = set_tag(newhead, "title", title)
    if description:
        newhead = set_tag(newhead, "description", description)
    if canonical:
        newhead = set_tag(newhead, "canonical", canonical)
    if page.get("seo_index") is not None:
        newhead = set_tag(newhead, "robots", "index,follow" if page["seo_index"] else "noindex,follow")
    if newhead != oldhead:
        path.write_text(original[:match.start(1)] + newhead + original[match.end(1):], encoding="utf-8")
        print("UPDATED", route)
        return True
    return False

def main():
    request = urllib.request.Request(PAGE_URL, headers={"apikey": KEY, "Authorization": "Bearer " + KEY})
    with urllib.request.urlopen(request, timeout=30) as response:
        rows = json.load(response)
    if not isinstance(rows, list):
        raise RuntimeError("Supabase response must be a list")
    seen = set()
    updated = 0
    for row in rows:
        if row.get("site_code") != "main":
            continue
        route = row.get("route")
        if route in seen:
            raise RuntimeError("Duplicate main-site route: " + str(route))
        seen.add(route)
        updated += publish(row)
    print(f"Checked {len(seen)} published main-site routes; changed {updated} HTML files.")
if __name__ == "__main__":
    main()
