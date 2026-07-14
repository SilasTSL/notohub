"""
profile_index.py
----------------
Generates the static profile index page HTML uploaded to S3 at
{username}/index.html — the "Fraunces" redesign (approved artifact:
new_profile_index.html).

The masthead (username/name/description/location/avatar/socials) is baked
in at render time. The article list is NOT baked in — an inline <script>
fetches it client-side on load (GET /articles/public?username=...) so the
page stays current without re-publishing the shell every time an article
is published, edited, or removed.

Uses the __TOKEN__ + str.replace() templating convention already used for
notion_to_html.py's "More from" section, rather than str.format()/f-string
interpolation — the page's CSS and JS are large, verbatim blocks lifted
from the approved mockup, and format-style interpolation would require
escaping every literal "{" and "}" in them, which is both tedious and an
easy place to introduce a subtle bug.
"""
from __future__ import annotations

import base64
import html as _html_module
import json as _json
from datetime import datetime, timezone

_e = _html_module.escape


# ── Social icons (X, GitHub, LinkedIn — verbatim from the approved artifact) ──

_X_SVG = (
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M18.9 2H22l-7.6 8.7L23.3 22h-6.8'
    'l-5.3-6.9L5.1 22H2l8.1-9.3L1.5 2h6.9l4.8 6.4L18.9 2Zm-1.2 18h1.9L7.2 4H5.2l12.5 16Z"/></svg>'
)
_GITHUB_SVG = (
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 0 0-3.16 19.49c.5.09'
    '.68-.22.68-.48v-1.7c-2.78.6-3.37-1.34-3.37-1.34-.45-1.16-1.11-1.47-1.11-1.47-.9-.62.07-.61'
    '.07-.61 1 .07 1.53 1.03 1.53 1.03.9 1.52 2.34 1.08 2.91.83.09-.65.35-1.09.63-1.34-2.22-.25'
    '-4.55-1.11-4.55-4.94 0-1.09.39-1.98 1.03-2.68-.1-.25-.45-1.27.1-2.65 0 0 .84-.27 2.75 1.02a'
    '9.5 9.5 0 0 1 5 0c1.91-1.29 2.75-1.02 2.75-1.02.55 1.38.2 2.4.1 2.65.64.7 1.03 1.59 1.03 2.68'
    ' 0 3.84-2.34 4.68-4.57 4.93.36.31.68.92.68 1.85v2.74c0 .27.18.58.69.48A10 10 0 0 0 12 2Z"/></svg>'
)
_LINKEDIN_SVG = (
    '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02'
    '-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37'
    '-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.14 2.07 2.07 0 0 1 0 4.14'
    'ZM7.12 20.45H3.55V9h3.57v11.45ZM22.22 0H1.77C.8 0 0 .78 0 1.74v20.51C0 23.22.8 24 1.77 24h20.45'
    'c.98 0 1.78-.78 1.78-1.75V1.74C24 .78 23.2 0 22.22 0Z"/></svg>'
)

_LOCATION_PIN_SVG = (
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2">'
    '<path d="M12 21s-7-6.5-7-11a7 7 0 0 1 14 0c0 4.5-7 11-7 11Z"/><circle cx="12" cy="10" r="2.5"/></svg>'
)


def _avatar_placeholder_data_uri(username: str) -> str:
    """
    Deterministic pine-green avatar tile with the user's first initial, used
    when avatar_url is absent. The same username always produces the same
    tile. Uses Georgia rather than the page's Fraunces web font — a data-URI
    <img> is decoded outside the document's font context, so it can't
    reliably pick up a Google Font; Georgia is the mockup's own declared
    fallback (--serif:"Fraunces",Georgia,serif) so it stays visually close.
    """
    seed = sum(ord(c) for c in username) if username else 0
    t = (seed % 101) / 100

    def _lerp(a: int, b: int) -> int:
        return round(a + (b - a) * t)

    bg = f"#{_lerp(0x22, 0x3a):02x}{_lerp(0x32, 0x5a):02x}{_lerp(0x2a, 0x48):02x}"
    initial = _e(username[0].upper()) if username else "?"
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="400" height="500" viewBox="0 0 400 500">'
        f'<rect width="400" height="500" fill="{bg}"/>'
        '<text x="200" y="268" font-family="Georgia, serif" font-size="180" font-weight="600" '
        f'fill="#dfe6e0" text-anchor="middle" dominant-baseline="middle">{initial}</text>'
        "</svg>"
    )
    return "data:image/svg+xml;base64," + base64.b64encode(svg.encode("utf-8")).decode("ascii")


# ── Page template ──────────────────────────────────────────────────────────
# Verbatim HTML/CSS from the approved artifact (new_profile_index.html) — only
# the pieces called out in the field mapping are swapped for __TOKEN__s.

_PAGE_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>__TITLE__</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;450;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
  :root{
    --ink:#111417;
    --ink-soft:#3d4650;
    --mute:#6b7683;
    --faint:#9aa4af;
    --line:#e6e3dc;
    --line-strong:#d4d0c6;
    --paper:#f7f5f0;
    --card:#ffffff;
    --accent:#2f6f4e;
    --accent-ink:#1e4a34;
    --wash:#eef0ec;
    --shadow:0 1px 2px rgba(20,25,30,.04), 0 8px 28px rgba(20,25,30,.05);
    --shadow-hover:0 2px 6px rgba(20,25,30,.06), 0 20px 46px rgba(20,25,30,.10);
    --serif:"Fraunces",Georgia,serif;
    --sans:"Inter",system-ui,sans-serif;
    --mono:"JetBrains Mono",ui-monospace,monospace;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}
  body{font-family:var(--sans);color:var(--ink);background:var(--paper);line-height:1.55}
  a{color:inherit;text-decoration:none}
  ::selection{background:var(--accent);color:#fff}

  /* ---------- top bar ---------- */
  .topbar{
    position:sticky;top:0;z-index:20;
    display:flex;align-items:center;justify-content:space-between;
    padding:16px clamp(20px,5vw,64px);
    background:rgba(247,245,240,.82);
    backdrop-filter:saturate(1.4) blur(10px);
    border-bottom:1px solid var(--line);
  }
  .brand{display:flex;align-items:center;gap:10px;font-weight:600;letter-spacing:-.01em}
  .brand .mark{
    width:26px;height:26px;border-radius:7px;background:var(--accent);color:#fff;
    display:grid;place-items:center;font-family:var(--serif);font-weight:600;font-size:15px;line-height:1;
    box-shadow:inset 0 0 0 1px rgba(255,255,255,.12);
  }
  .brand span{font-size:15px;color:var(--ink)}
  .topbar .meta{font-family:var(--mono);font-size:11.5px;color:var(--faint);letter-spacing:.02em}

  /* ---------- shell ---------- */
  .shell{max-width:1120px;margin:0 auto;padding:0 clamp(20px,5vw,64px)}

  /* ---------- masthead ---------- */
  .hero{
    display:grid;grid-template-columns:minmax(0,1fr) auto;
    gap:48px;align-items:end;
    padding:clamp(56px,9vw,104px) 0 44px;
    border-bottom:1px solid var(--line);
  }
  .eyebrow{
    font-family:var(--mono);font-size:12px;font-weight:500;
    letter-spacing:.14em;text-transform:uppercase;color:var(--accent-ink);
    display:flex;align-items:center;gap:10px;margin-bottom:22px;
  }
  .eyebrow::before{content:"";width:22px;height:1.5px;background:var(--accent)}
  h1.name{
    font-family:var(--serif);font-weight:500;
    font-size:clamp(52px,9.5vw,104px);line-height:.92;letter-spacing:-.02em;color:var(--ink);
    word-break:break-word;
  }
  .bio{margin-top:26px;max-width:48ch;font-size:18px;line-height:1.6;color:var(--ink-soft)}
  .socials{display:flex;gap:8px;margin-top:30px}
  .socials a{
    width:38px;height:38px;border-radius:9px;display:grid;place-items:center;
    border:1px solid var(--line-strong);background:var(--card);color:var(--mute);transition:.18s ease;
  }
  .socials a:hover{color:var(--accent-ink);border-color:var(--accent);transform:translateY(-2px);box-shadow:var(--shadow)}
  .socials svg{width:17px;height:17px}

  .portrait{
    position:relative;width:clamp(140px,20vw,196px);aspect-ratio:4/5;
    border-radius:14px;overflow:hidden;box-shadow:var(--shadow);border:1px solid var(--line);
  }
  .portrait img{width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(.12) contrast(1.02)}
  .portrait figcaption{
    position:absolute;left:10px;bottom:10px;
    font-family:var(--mono);font-size:10.5px;letter-spacing:.04em;color:#fff;
    background:rgba(17,20,23,.55);backdrop-filter:blur(4px);padding:4px 8px;border-radius:6px;
    display:flex;align-items:center;gap:5px;
  }
  .portrait figcaption svg{width:10px;height:10px;opacity:.85}

  /* ---------- articles ---------- */
  .section-head{display:flex;align-items:baseline;justify-content:space-between;padding:64px 0 28px}
  .section-head h2{font-family:var(--serif);font-weight:500;font-size:26px;letter-spacing:-.01em}
  .section-head .count{font-family:var(--mono);font-size:12px;color:var(--faint);letter-spacing:.04em}

  .grid{display:grid;grid-template-columns:repeat(12,1fr);gap:22px;padding-bottom:80px}
  .card{
    grid-column:span 4;display:flex;flex-direction:column;
    background:var(--card);border:1px solid var(--line);border-radius:14px;overflow:hidden;
    transition:.2s cubic-bezier(.2,.7,.3,1);position:relative;
  }
  .card::after{
    content:"";position:absolute;inset:0;border-radius:14px;
    box-shadow:inset 0 0 0 1.5px var(--accent);opacity:0;transition:opacity .2s;pointer-events:none;
  }
  .card:hover{transform:translateY(-4px);box-shadow:var(--shadow-hover);border-color:transparent}
  .card:hover::after{opacity:1}
  .card:hover .thumb img{transform:scale(1.04)}
  .card:focus-within{outline:2px solid var(--accent);outline-offset:2px}

  /* feature the newest — larger thumb + headline carry it, no invented copy */
  .card.feature{grid-column:span 8;grid-row:span 2;flex-direction:row}
  .card.feature .thumb{width:56%;aspect-ratio:auto;border-bottom:0;border-right:1px solid var(--line)}
  .card.feature .body{justify-content:space-between;padding:32px 30px 26px}
  .card.feature h3{font-size:30px;line-height:1.12}

  .thumb{aspect-ratio:16/10;overflow:hidden;background:var(--wash);border-bottom:1px solid var(--line)}
  .thumb img{width:100%;height:100%;object-fit:cover;display:block;transition:transform .35s ease}

  .body{padding:20px 20px 18px;display:flex;flex-direction:column;flex:1;gap:12px}
  .card h3{font-family:var(--serif);font-weight:500;font-size:19px;line-height:1.2;letter-spacing:-.005em;color:var(--ink)}
  .card .foot{margin-top:auto;display:flex;align-items:center;justify-content:space-between;padding-top:16px;border-top:1px solid var(--line)}
  .card .date{font-family:var(--mono);font-size:11.5px;color:var(--faint);letter-spacing:.02em}
  .card .arrow{color:var(--faint);transition:.18s;display:grid;place-items:center}
  .card:hover .arrow{color:var(--accent-ink);transform:translate(3px,-3px)}
  .card .arrow svg{width:15px;height:15px}

  /* ---------- empty / loading / error states ---------- */
  .empty-state,.loading-state{
    grid-column:1/-1;text-align:center;padding:48px 0;
    font-size:15px;color:var(--mute);
  }

  /* ---------- footer ---------- */
  footer{
    border-top:1px solid var(--line);padding:36px clamp(20px,5vw,64px);
    display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;
    font-family:var(--mono);font-size:12px;color:var(--faint);letter-spacing:.02em;
  }
  footer .np{display:flex;align-items:center;gap:7px}
  footer .np b{color:var(--accent-ink);font-weight:500}
  footer a:hover{color:var(--ink)}

  /* ---------- responsive ---------- */
  @media (max-width:900px){
    .card,.card.feature{grid-column:span 6}
    .card.feature{flex-direction:column;grid-row:auto}
    .card.feature .thumb{width:100%;aspect-ratio:16/10;border-right:0;border-bottom:1px solid var(--line)}
    .card.feature .body{padding:22px 20px 18px}
    .card.feature h3{font-size:22px}
  }
  @media (max-width:680px){
    .hero{grid-template-columns:1fr;gap:32px;align-items:start}
    .portrait{order:-1;width:150px}
    .grid{gap:16px}
    .card,.card.feature{grid-column:span 12}
  }
  @media (prefers-reduced-motion:reduce){*{transition:none!important;animation:none!important}}
</style>
</head>
<body>

  <header class="topbar">
    <div class="brand"><span class="mark">N</span><span>NotoHub</span></div>
    <div class="meta">__META_URL__</div>
  </header>

  <div class="shell">

    <!-- masthead: username + name + description + socials (+ optional location) -->
    <section class="hero">
      <div class="hero-lede">
        __EYEBROW_HTML__
        <h1 class="name">__USERNAME__</h1>
        __BIO_HTML__
        __SOCIALS_HTML__
      </div>
      <figure class="portrait">
        <img src="__AVATAR_SRC__" alt="__PORTRAIT_ALT__">
        __LOCATION_HTML__
      </figure>
    </section>

    <!-- articles -->
    <div class="section-head" id="section-head">
      <h2>Articles</h2>
      <span class="count" id="article-count"></span>
    </div>

    <main class="grid" id="articles-area">
      <p class="loading-state">Loading articles&hellip;</p>
    </main>
  </div>

  <footer>
    <div class="np">Published with <b>NotoHub</b></div>
    <div>&copy; __YEAR__ __USERNAME__</div>
  </footer>

  <script>
    (function () {
      var USERNAME = __USERNAME_JSON__;
      var API = "__API_BASE_URL__";

      function esc(s) {
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }

      // Deterministic hash so the same article title always gets the same
      // placeholder cover — no dependency, just a small string hash (djb2-ish).
      function hashStr(s) {
        var h = 0;
        for (var i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; }
        return h;
      }

      var COVER_TINTS = ["#2dd4bf", "#7c8cf8", "#a78bfa", "#34d399", "#f5c88a"];

      // Abstract, on-brand cover placeholder — one of three geometric motifs
      // (picked from the hash), tinted from a small on-brand palette (also
      // picked from the hash). Same title always produces the same cover.
      function coverPlaceholder(title) {
        var h = hashStr(title || "");
        var tint = COVER_TINTS[h % COVER_TINTS.length];
        var variant = Math.floor(h / COVER_TINTS.length) % 3;
        var shapes = "";

        if (variant === 0) {
          // constellation: a handful of nodes connected to the first one
          var pts = [];
          for (var i = 0; i < 7; i++) {
            var hx = (h >>> (i * 3)) % 620;
            var hy = (h >>> (i * 2 + 1)) % 320;
            pts.push([40 + hx, 40 + hy]);
          }
          for (var j = 1; j < pts.length; j++) {
            shapes += '<line x1="' + pts[0][0] + '" y1="' + pts[0][1] + '" x2="' + pts[j][0] + '" y2="' + pts[j][1] + '" stroke="' + tint + '" stroke-width="1" opacity=".35"/>';
          }
          for (var p = 0; p < pts.length; p++) {
            shapes += '<circle cx="' + pts[p][0] + '" cy="' + pts[p][1] + '" r="5" fill="' + tint + '" opacity=".8"/>';
          }
        } else if (variant === 1) {
          // bar field, heights derived from the hash
          for (var k = 0; k < 22; k++) {
            var bh = 40 + ((h >>> (k % 16)) % 260);
            var x = 20 + k * 30;
            shapes += '<rect x="' + x + '" y="' + (360 - bh) + '" width="11" height="' + bh + '" rx="3" fill="' + tint + '" opacity="' + (0.35 + (bh % 60) / 100).toFixed(2) + '"/>';
          }
        } else {
          // radial burst from a center node
          var cx = 350, cy = 200;
          shapes += '<circle cx="' + cx + '" cy="' + cy + '" r="30" fill="' + tint + '"/>';
          for (var m = 0; m < 8; m++) {
            var angle = ((h + m * 45) % 360) * Math.PI / 180;
            var ex = cx + Math.cos(angle) * 150;
            var ey = cy + Math.sin(angle) * 150;
            shapes += '<line x1="' + cx + '" y1="' + cy + '" x2="' + ex + '" y2="' + ey + '" stroke="' + tint + '" stroke-width="1.5" opacity=".35"/>';
            shapes += '<circle cx="' + ex + '" cy="' + ey + '" r="10" fill="' + tint + '" opacity=".7"/>';
          }
        }

        var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="700" height="400" viewBox="0 0 700 400">'
          + '<rect width="700" height="400" fill="#0c1418"/>' + shapes + '</svg>';
        return "data:image/svg+xml;base64," + btoa(svg);
      }

      function renderArticleCard(a, isFeature) {
        var date = "";
        try {
          date = new Date(a.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
        } catch (err) {}
        var href = "/" + encodeURIComponent(USERNAME) + "/" + encodeURIComponent(a.slug) + "/";
        var cover = a.coverImageUrl ? esc(a.coverImageUrl) : coverPlaceholder(a.title || "");
        var cls = isFeature ? "card feature" : "card";
        return '<a class="' + cls + '" href="' + esc(href) + '">'
          + '<div class="thumb"><img src="' + cover + '" alt="" loading="lazy"></div>'
          + '<div class="body"><h3>' + esc(a.title) + '</h3>'
          + '<div class="foot"><span class="date">' + esc(date) + '</span>'
          + '<span class="arrow" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M7 17 17 7M9 7h8v8"/></svg></span>'
          + '</div></div></a>';
      }

      function renderArticles(articles) {
        var area = document.getElementById("articles-area");
        var countEl = document.getElementById("article-count");
        if (!area) return;

        if (!articles.length) {
          if (countEl) countEl.textContent = "";
          area.className = "";
          area.innerHTML = '<p class="empty-state">No articles published yet.</p>';
          return;
        }

        if (countEl) countEl.textContent = articles.length + " published";

        // Only the newest article gets the wide "feature" treatment, and
        // only once there's enough content either side of it — with 1-2
        // articles a feature card plus near-empty grid looks lopsided.
        var useFeature = articles.length >= 3;
        var html = articles.map(function (a, i) {
          return renderArticleCard(a, useFeature && i === 0);
        }).join("");

        area.className = "grid";
        area.innerHTML = html;
      }

      fetch(API + "/articles/public?username=" + encodeURIComponent(USERNAME))
        .then(function (r) { return r.json(); })
        .then(function (body) { renderArticles(body.data || []); })
        .catch(function () {
          var area = document.getElementById("articles-area");
          if (area) {
            area.className = "";
            area.innerHTML = '<p class="empty-state">Couldn\\u2019t load articles. Please refresh.</p>';
          }
        });
    })();
  </script>

</body>
</html>"""


# ── Public API ────────────────────────────────────────────────────────────────

def render_profile_index_shell(
    username: str,
    name: str | None = None,
    bio: str | None = None,
    location: str | None = None,
    avatar_url: str | None = None,
    social_links: dict | None = None,
    api_base_url: str = "https://api.notohub.com",
) -> str:
    """
    Return a complete, self-contained HTML page for the user's public profile.

    Args:
        username:      NotoHub username — always present.
        name:          Display name, if the user set one. Omits the eyebrow
                       label entirely when absent (never renders an empty one).
        bio:           Short description/bio, if set.
        location:      Free-text location, if set. Omits the portrait's
                       figcaption entirely when absent.
        avatar_url:    Uploaded avatar URL. Falls back to a deterministic
                       generated placeholder tile when absent.
        social_links:  {"twitter": ..., "github": ..., "linkedin": ...} —
                       any subset, any may be absent. "twitter" renders as
                       the "X" icon/label. Omits the whole nav when empty.
        api_base_url:  Base URL the inline script fetches the article list
                       from at GET /articles/public?username=...
    """
    sl = social_links or {}

    # ── Eyebrow (display name) ──────────────────────────────────────────────
    eyebrow_html = f'<div class="eyebrow">{_e(name)}</div>' if name else ""

    # ── Bio ──────────────────────────────────────────────────────────────────
    bio_html = f'<p class="bio">{_e(bio)}</p>' if bio else ""

    # ── Socials ──────────────────────────────────────────────────────────────
    social_items: list[str] = []
    if sl.get("twitter"):
        social_items.append(
            f'<a href="{_e(sl["twitter"])}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="X" title="X">{_X_SVG}</a>'
        )
    if sl.get("github"):
        social_items.append(
            f'<a href="{_e(sl["github"])}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="GitHub" title="GitHub">{_GITHUB_SVG}</a>'
        )
    if sl.get("linkedin"):
        social_items.append(
            f'<a href="{_e(sl["linkedin"])}" target="_blank" rel="noopener noreferrer" '
            f'aria-label="LinkedIn" title="LinkedIn">{_LINKEDIN_SVG}</a>'
        )
    socials_html = (
        f'<nav class="socials" aria-label="Social links">{"".join(social_items)}</nav>'
        if social_items else ""
    )

    # ── Portrait: avatar (real or placeholder) + optional location caption ───
    avatar_src = _e(avatar_url) if avatar_url else _avatar_placeholder_data_uri(username)
    portrait_alt = _e(name) if name else _e(username)
    location_html = (
        f'<figcaption>{_LOCATION_PIN_SVG}{_e(location)}</figcaption>' if location else ""
    )

    year = datetime.now(timezone.utc).year

    html = (
        _PAGE_TEMPLATE
        .replace("__TITLE__", f"{_e(username)} — NotoHub")
        .replace("__META_URL__", f"notohub.com/{_e(username)}")
        .replace("__EYEBROW_HTML__", eyebrow_html)
        .replace("__BIO_HTML__", bio_html)
        .replace("__SOCIALS_HTML__", socials_html)
        .replace("__AVATAR_SRC__", avatar_src)
        .replace("__PORTRAIT_ALT__", portrait_alt)
        .replace("__LOCATION_HTML__", location_html)
        .replace("__YEAR__", str(year))
        .replace("__USERNAME_JSON__", _json.dumps(username))
        .replace("__API_BASE_URL__", api_base_url.rstrip("/"))
        .replace("__USERNAME__", _e(username))
    )
    return html
