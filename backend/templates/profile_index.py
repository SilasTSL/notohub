"""
profile_index.py
----------------
Generates the static profile index shell HTML uploaded to S3 at
{username}/index.html.

The page loads instantly with the user's bio/avatar/links baked in,
then fetches articles client-side on load via the public API.
"""
from __future__ import annotations

import html as _html_module


# ── Avatar initial colour — deterministic from username ─────────────────────

_INITIAL_COLOURS = [
    "#1a8917", "#0077b6", "#c0392b", "#e67e22",
    "#7b2d8b", "#2d6a4f", "#e76f51",
]


def _avatar_colour(username: str) -> str:
    return _INITIAL_COLOURS[sum(ord(c) for c in username) % len(_INITIAL_COLOURS)]


# ── SVG icons (self-contained, no external CDN) ──────────────────────────────

_TWITTER_SVG = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
    '<path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231'
    "H2.747l7.73-8.835L1.254 2.25H8.08l4.253 5.622 5.91-5.622zm-1.161 17.52h1.833L7.084"
    ' 4.126H5.117z"/></svg>'
)

_GITHUB_SVG = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
    '<path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217'
    ".682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11"
    "-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529"
    " 2.341 1.087 2.91.831.092-.647.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943"
    " 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025"
    "A9.578 9.578 0 0112 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025"
    " 2.747-1.025.546 1.377.202 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339"
    " 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0"
    " .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z"
    '"/></svg>'
)

_LINKEDIN_SVG = (
    '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">'
    '<path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136'
    " 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85"
    " 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065"
    " 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792"
    " 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227"
    ' 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>'
)


# ── Public API ────────────────────────────────────────────────────────────────

def render_profile_index_shell(
    username: str,
    bio: str | None = None,
    avatar_url: str | None = None,
    social_links: dict | None = None,
    api_base_url: str = "https://api.notohub.com",
) -> str:
    """
    Return a complete, self-contained HTML page for the user's public profile.

    The article list is NOT baked in — an inline <script> fetches it on load
    so the page stays current without re-publishing.
    """
    sl = social_links or {}
    e = _html_module.escape

    # ── Avatar block ──────────────────────────────────────────────────────────
    if avatar_url:
        avatar_block = f'<img class="avatar-img" src="{e(avatar_url)}" alt="{e(username)}">'
    else:
        colour = _avatar_colour(username)
        initial = username[0].upper() if username else "?"
        avatar_block = (
            f'<div class="avatar-initial" style="background:{colour}">'
            f"{initial}</div>"
        )

    # ── Bio block ─────────────────────────────────────────────────────────────
    bio_block = f'<p class="profile-bio">{e(bio)}</p>' if bio else ""

    # ── Social links ─────────────────────────────────────────────────────────
    social_items: list[str] = []
    if sl.get("twitter"):
        social_items.append(
            f'<a class="social-link" href="{e(sl["twitter"])}" '
            f'target="_blank" rel="noopener noreferrer" aria-label="X (Twitter)">'
            f"{_TWITTER_SVG}</a>"
        )
    if sl.get("github"):
        social_items.append(
            f'<a class="social-link" href="{e(sl["github"])}" '
            f'target="_blank" rel="noopener noreferrer" aria-label="GitHub">'
            f"{_GITHUB_SVG}</a>"
        )
    if sl.get("linkedin"):
        social_items.append(
            f'<a class="social-link" href="{e(sl["linkedin"])}" '
            f'target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">'
            f"{_LINKEDIN_SVG}</a>"
        )
    social_block = (
        f'<div class="social-links">{"".join(social_items)}</div>'
        if social_items
        else ""
    )

    # ── JS strings — username and API URL embedded at generation time ─────────
    # Username is validated as alphanumeric + hyphens upstream; safe to embed.
    js_username = username
    js_api = api_base_url.rstrip("/")

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{e(username)} &mdash; NotoHub</title>
  <meta name="description" content="{e(bio) if bio else e(username) + " on NotoHub"}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:wght@400;600&amp;family=Source+Sans+3:wght@400;600&amp;display=swap" rel="stylesheet">

  <style>
    *, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}

    :root {{
      --serif:      "Lora", Georgia, serif;
      --sans:       "Source Sans 3", system-ui, sans-serif;
      --ink:        #1a1a1a;
      --ink-muted:  #6b6b6b;
      --ink-faint:  #b3b3b3;
      --bg:         #ffffff;
      --bg-subtle:  #f9f9f9;
      --accent:     #1a8917;
      --border:     #e6e6e6;
      --max-w:      680px;
    }}

    html {{ font-size: 18px; scroll-behavior: smooth; }}
    body {{
      font-family: var(--sans);
      color: var(--ink);
      background: var(--bg);
      line-height: 1.7;
      -webkit-font-smoothing: antialiased;
    }}

    /* ── Top nav ── */
    nav.top-bar {{
      position: sticky; top: 0; z-index: 900;
      background: rgba(255,255,255,0.94);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      padding: 0 2rem;
      height: 56px;
      display: flex; align-items: center; justify-content: space-between;
    }}
    .nav-logo {{
      font-family: var(--serif);
      font-weight: 600; font-size: 1.1rem;
      color: var(--ink); text-decoration: none;
      letter-spacing: -0.02em;
    }}
    .nav-logo:hover {{ color: var(--accent); }}

    /* ── Page wrapper ── */
    .page {{
      max-width: var(--max-w);
      margin: 0 auto;
      padding: 3.5rem 1.5rem 5rem;
    }}

    /* ── Profile header ── */
    .profile-header {{ text-align: center; margin-bottom: 3rem; }}

    .avatar-img {{
      width: 96px; height: 96px;
      border-radius: 50%;
      object-fit: cover;
      margin: 0 auto 1.25rem;
      display: block;
      border: 3px solid var(--border);
    }}
    .avatar-initial {{
      width: 96px; height: 96px;
      border-radius: 50%;
      margin: 0 auto 1.25rem;
      display: flex; align-items: center; justify-content: center;
      font-family: var(--serif);
      font-size: 2.2rem; font-weight: 600;
      color: #fff;
      user-select: none;
    }}

    .profile-username {{
      font-family: var(--serif);
      font-size: clamp(1.6rem, 4vw, 2.2rem);
      font-weight: 600;
      color: var(--ink);
      margin-bottom: 0.75rem;
      letter-spacing: -0.02em;
    }}

    .profile-bio {{
      font-size: 0.94rem;
      color: var(--ink-muted);
      max-width: 480px;
      margin: 0 auto 1.25rem;
      line-height: 1.65;
    }}

    .social-links {{
      display: flex; gap: 1rem;
      justify-content: center;
      margin-top: 0.5rem;
    }}
    .social-link {{
      color: var(--ink-muted);
      display: flex; align-items: center;
      transition: color 0.15s;
    }}
    .social-link:hover {{ color: var(--accent); }}

    /* ── Divider ── */
    hr.section-divider {{
      border: none;
      border-top: 1px solid var(--border);
      margin: 0 0 2.5rem;
    }}

    /* ── Articles section ── */
    .section-heading {{
      font-family: var(--sans);
      font-size: 0.75rem;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--ink-muted);
      margin-bottom: 1.5rem;
    }}

    .article-list {{ display: flex; flex-direction: column; gap: 0; }}

    .article-row {{
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 1rem;
      padding: 1rem 0;
      border-bottom: 1px solid var(--border);
      text-decoration: none;
      color: inherit;
    }}
    .article-row:first-child {{ border-top: 1px solid var(--border); }}
    .article-row:hover .article-title {{ color: var(--accent); }}

    .article-title {{
      font-family: var(--serif);
      font-size: 1rem;
      font-weight: 400;
      color: var(--ink);
      transition: color 0.15s;
      flex: 1;
      min-width: 0;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }}
    .article-date {{
      font-family: var(--sans);
      font-size: 0.8rem;
      color: var(--ink-faint);
      white-space: nowrap;
      flex-shrink: 0;
    }}

    .articles-placeholder {{
      font-family: var(--sans);
      font-size: 0.9rem;
      color: var(--ink-muted);
      padding: 1.5rem 0;
    }}

    /* ── Footer ── */
    footer.site-footer {{
      margin-top: 4rem;
      padding-top: 2rem;
      border-top: 1px solid var(--border);
      text-align: center;
      font-family: var(--sans);
      font-size: 0.8rem;
      color: var(--ink-faint);
    }}
    footer.site-footer a {{
      color: var(--accent);
      text-decoration: none;
    }}
    footer.site-footer a:hover {{ text-decoration: underline; }}

    @media (max-width: 480px) {{
      .page {{ padding-top: 2rem; }}
    }}
  </style>
</head>
<body>

  <nav class="top-bar">
    <a class="nav-logo" href="https://www.notohub.com/">NotoHub</a>
  </nav>

  <div class="page">

    <header class="profile-header">
      {avatar_block}
      <h1 class="profile-username">{e(username)}</h1>
      {bio_block}
      {social_block}
    </header>

    <hr class="section-divider">

    <section>
      <p class="section-heading">Articles</p>
      <div id="articles-list">
        <p class="articles-placeholder">Loading articles&hellip;</p>
      </div>
    </section>

    <footer class="site-footer">
      Published with <a href="https://www.notohub.com">NotoHub</a>
    </footer>

  </div>

  <script>
    (function () {{
      var USERNAME = "{js_username}";
      var API      = "{js_api}";

      fetch(API + "/articles/public?username=" + encodeURIComponent(USERNAME))
        .then(function (r) {{ return r.json(); }})
        .then(function (body) {{
          var articles = body.data || [];
          var el = document.getElementById("articles-list");
          if (!el) return;

          if (!articles.length) {{
            el.innerHTML = '<p class="articles-placeholder">No articles published yet.</p>';
            return;
          }}

          el.innerHTML =
            '<div class="article-list">' +
            articles
              .map(function (a) {{
                var date = "";
                try {{
                  date = new Date(a.publishedAt).toLocaleDateString("en-US", {{
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  }});
                }} catch (err) {{}}
                return (
                  '<a class="article-row" href="/' +
                  encodeURIComponent(USERNAME) +
                  "/" +
                  encodeURIComponent(a.slug) +
                  '/">' +
                  '<span class="article-title">' +
                  _esc(a.title) +
                  "</span>" +
                  '<span class="article-date">' +
                  _esc(date) +
                  "</span>" +
                  "</a>"
                );
              }})
              .join("") +
            "</div>";
        }})
        .catch(function () {{
          var el = document.getElementById("articles-list");
          if (el) {{
            el.innerHTML =
              '<p class="articles-placeholder">Couldn’t load articles. Please refresh.</p>';
          }}
        }});

      function _esc(s) {{
        return String(s)
          .replace(/&/g, "&amp;")
          .replace(/</g, "&lt;")
          .replace(/>/g, "&gt;")
          .replace(/"/g, "&quot;");
      }}
    }})();
  </script>

</body>
</html>"""
