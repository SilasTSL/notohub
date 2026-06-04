"""
notion_to_html.py
-----------------
Converts a Notion page into a Medium-style HTML string.

Auth is intentionally decoupled — swap `token_auth()` for your own
OAuth / service-account function and pass it into `page_id_to_html()`.
"""

from __future__ import annotations

import re
import json
import math
import os
import urllib.request
import urllib.error
from datetime import datetime
from typing import Callable


# ---------------------------------------------------------------------------
# 1.  PLUGGABLE AUTH
# ---------------------------------------------------------------------------

def token_auth(token: str) -> Callable[[], dict]:
    """
    Returns an auth-header factory that uses a static Notion integration token.

    To swap in OAuth in the future, write a function with the same signature:

        def my_oauth_auth() -> dict:
            access_token = fetch_access_token_from_your_idp()
            return {
                "Authorization": f"Bearer {access_token}",
                "Notion-Version": NOTION_VERSION,
            }

    and pass `my_oauth_auth` (not called) to `page_id_to_html()`.
    """
    NOTION_VERSION = "2022-06-28"

    def _headers() -> dict:
        return {
            "Authorization": f"Bearer {token}",
            "Notion-Version": NOTION_VERSION,
            "Content-Type": "application/json",
        }

    return _headers


def env_auth() -> Callable[[], dict]:
    """
    Convenience wrapper: reads NOTION_API_KEY from the environment.
    Use this for local dev and Lambda (token-based). Replace with an
    OAuth factory when moving to public connections.
    """
    token = os.environ.get("NOTION_API_KEY", "")
    if not token:
        raise EnvironmentError("NOTION_API_KEY environment variable is not set")
    return token_auth(token)


# ---------------------------------------------------------------------------
# 2.  NOTION API HELPERS
# ---------------------------------------------------------------------------

NOTION_API = "https://api.notion.com/v1"


def _request(url: str, headers: dict) -> dict:
    req = urllib.request.Request(url, headers=headers)
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _post_request(url: str, headers: dict, body: dict) -> dict:
    data = json.dumps(body).encode()
    req = urllib.request.Request(url, data=data, headers=headers, method="POST")
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())


def _extract_page_id(url: str) -> str:
    """
    Pulls the 32-hex-char page ID from any Notion URL format:
      - https://www.notion.so/My-Page-Title-<id>
      - https://www.notion.so/<workspace>/<id>
      - https://notion.so/<id>
      - raw UUID (with or without dashes)
    """
    clean = re.split(r"[?#]", url)[0].rstrip("/")
    slug = clean.split("/")[-1]
    raw = re.sub(r"^.*-([a-f0-9]{32})$", r"\1", slug, flags=re.IGNORECASE)
    raw = raw.replace("-", "")
    if re.fullmatch(r"[a-f0-9]{32}", raw, re.IGNORECASE):
        return raw
    raise ValueError(f"Could not extract a Notion page ID from: {url!r}")


def _fetch_blocks(block_id: str, auth_fn: Callable[[], dict]) -> list:
    """
    Recursively fetches all block children, attaching nested children as
    block["_children"]. Handles pagination automatically.
    """
    blocks = []
    cursor = None
    while True:
        endpoint = f"{NOTION_API}/blocks/{block_id}/children?page_size=100"
        if cursor:
            endpoint += f"&start_cursor={cursor}"
        data = _request(endpoint, auth_fn())
        blocks.extend(data.get("results", []))
        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")

    for block in blocks:
        if block.get("has_children"):
            block["_children"] = _fetch_blocks(block["id"], auth_fn)
        else:
            block["_children"] = []

    return blocks


def fetch_notion_page(page_id: str, auth_fn: Callable[[], dict]) -> dict:
    """
    Fetches page metadata and all block children (recursive, paginated).
    Returns {"meta": {...}, "blocks": [...]}.
    Author is NOT fetched here — pass it explicitly to page_id_to_html().
    """
    meta = _request(f"{NOTION_API}/pages/{page_id}", auth_fn())
    blocks = _fetch_blocks(page_id, auth_fn)
    return {"meta": meta, "blocks": blocks}


def fetch_database_pages(
    database_id: str,
    auth_fn: Callable[[], dict],
    status_filter: str = "Published",
) -> list[dict]:
    """
    Returns all pages from a Notion database matching the Status filter.
    Handles pagination automatically.
    """
    pages: list[dict] = []
    cursor: str | None = None

    while True:
        body: dict = {
            "filter": {"property": "Status", "select": {"equals": status_filter}},
            "sorts": [{"property": "Published Date", "direction": "descending"}],
            "page_size": 100,
        }
        if cursor:
            body["start_cursor"] = cursor

        data = _post_request(
            f"{NOTION_API}/databases/{database_id}/query",
            auth_fn(),
            body,
        )
        pages.extend(r for r in data.get("results", []) if r.get("object") == "page")

        if not data.get("has_more"):
            break
        cursor = data.get("next_cursor")

    return pages


# ---------------------------------------------------------------------------
# 3.  RICH-TEXT & BLOCK RENDERING
# ---------------------------------------------------------------------------

def _rich_text_to_html(rich_texts: list) -> str:
    """Converts a Notion rich_text array to an HTML string."""
    parts = []
    for rt in rich_texts:
        text = rt.get("plain_text", "")
        text = (text.replace("&", "&amp;")
                    .replace("<", "&lt;")
                    .replace(">", "&gt;"))
        annots = rt.get("annotations", {})
        if annots.get("code"):
            text = f"<code>{text}</code>"
        if annots.get("bold"):
            text = f"<strong>{text}</strong>"
        if annots.get("italic"):
            text = f"<em>{text}</em>"
        if annots.get("strikethrough"):
            text = f"<s>{text}</s>"
        if annots.get("underline"):
            text = f"<u>{text}</u>"
        color = annots.get("color", "default")
        if color and color != "default":
            css_color = color.replace("_background", "")
            if "background" in color:
                text = f'<mark class="highlight-{css_color}">{text}</mark>'
            else:
                text = f'<span class="text-{css_color}">{text}</span>'
        href = rt.get("href")
        if href:
            text = f'<a href="{href}" target="_blank" rel="noopener">{text}</a>'
        parts.append(text)
    return "".join(parts)


def _list_item_to_html(block: dict, tag: str, depth: int) -> str:
    btype = block.get("type", "")
    data = block.get(btype, {})
    html_text = _rich_text_to_html(data.get("rich_text", []))
    children = block.get("_children", [])

    inner = html_text
    if children:
        inner += "\n" + _blocks_to_html(children, depth=depth + 1)

    indent = "  " * depth
    return f"{indent}<li>{inner}</li>\n"


def _block_to_html(block: dict, depth: int = 0) -> str:
    """Converts a single Notion block dict to an HTML string."""
    btype = block.get("type", "")
    data = block.get(btype, {})
    rt = data.get("rich_text", [])
    html_text = _rich_text_to_html(rt)
    children = block.get("_children", [])
    indent = "  " * depth

    if btype == "paragraph":
        inner = html_text or "&nbsp;"
        if children:
            inner += "\n" + _blocks_to_html(children, depth=depth + 1)
        return f"{indent}<p>{inner}</p>\n"

    elif btype == "heading_1":
        return f"{indent}<h1>{html_text}</h1>\n"

    elif btype == "heading_2":
        return f"{indent}<h2>{html_text}</h2>\n"

    elif btype == "heading_3":
        return f"{indent}<h3>{html_text}</h3>\n"

    elif btype in ("bulleted_list_item", "numbered_list_item"):
        tag = "ul" if btype == "bulleted_list_item" else "ol"
        return _list_item_to_html(block, tag, depth)

    elif btype == "to_do":
        checked = "checked" if data.get("checked") else ""
        inner = f'<input type="checkbox" {checked} disabled> {html_text}'
        if children:
            inner += "\n" + _blocks_to_html(children, depth=depth + 1)
        return f'{indent}<label class="todo">{inner}</label>\n'

    elif btype == "toggle":
        children_html = _blocks_to_html(children, depth=depth + 1) if children else ""
        return (f'{indent}<details class="toggle">\n'
                f'{indent}  <summary>{html_text}</summary>\n'
                f'{children_html}'
                f'{indent}</details>\n')

    elif btype == "code":
        lang = data.get("language", "")
        code = _rich_text_to_html(rt)
        caption = _rich_text_to_html(data.get("caption", []))
        cap_html = f'<figcaption>{caption}</figcaption>' if caption else ""
        return (f'{indent}<figure class="code-block">\n'
                f'{indent}  <pre><code class="language-{lang}">{code}</code></pre>\n'
                f'{indent}  {cap_html}\n'
                f'{indent}</figure>\n')

    elif btype == "quote":
        inner = html_text
        if children:
            inner += "\n" + _blocks_to_html(children, depth=depth + 1)
        return f'{indent}<blockquote>{inner}</blockquote>\n'

    elif btype == "callout":
        icon = data.get("icon", {})
        emoji = icon.get("emoji", "💡") if icon else "💡"
        bg = data.get("color", "gray_background")
        inner = html_text
        if children:
            inner += "\n" + _blocks_to_html(children, depth=depth + 1)
        return (f'{indent}<div class="callout callout-{bg}">'
                f'<span class="callout-icon">{emoji}</span>'
                f'<div>{inner}</div></div>\n')

    elif btype == "divider":
        return f"{indent}<hr>\n"

    elif btype == "image":
        return ""  # images not supported

    elif btype == "video":
        vtype = data.get("type", "external")
        url = data.get(vtype, {}).get("url", "")
        yt_match = re.search(r"(?:v=|youtu\.be/)([A-Za-z0-9_-]{11})", url)
        if yt_match:
            vid = yt_match.group(1)
            return (f'{indent}<figure class="video-block">\n'
                    f'{indent}  <iframe src="https://www.youtube.com/embed/{vid}" '
                    f'frameborder="0" allowfullscreen></iframe>\n'
                    f'{indent}</figure>\n')
        return f'{indent}<a href="{url}" target="_blank">{url}</a>\n'

    elif btype == "bookmark":
        url = data.get("url", "")
        caption = _rich_text_to_html(data.get("caption", []))
        label = caption or url
        return (f'{indent}<div class="bookmark">'
                f'<a href="{url}" target="_blank" rel="noopener">{label}</a>'
                f'</div>\n')

    elif btype == "table_of_contents":
        return f'{indent}<nav id="toc-placeholder" aria-label="Table of contents"></nav>\n'

    elif btype == "column_list":
        cols_html = _blocks_to_html(children, depth=depth + 1) if children else ""
        return f'{indent}<div class="column-list">\n{cols_html}{indent}</div>\n'

    elif btype == "column":
        col_html = _blocks_to_html(children, depth=depth + 1) if children else ""
        return f'{indent}<div class="column">\n{col_html}{indent}</div>\n'

    return f"<!-- unsupported block type: {btype} -->\n"


def _blocks_to_html(blocks: list, depth: int = 0) -> str:
    """
    Converts a list of Notion blocks to HTML.
    Consecutive bulleted/numbered list items are grouped into <ul>/<ol>.
    """
    lines = []
    indent = "  " * depth
    i = 0
    while i < len(blocks):
        b = blocks[i]
        btype = b.get("type", "")

        if btype == "bulleted_list_item":
            lines.append(f"{indent}<ul>\n")
            while i < len(blocks) and blocks[i].get("type") == "bulleted_list_item":
                lines.append(_list_item_to_html(blocks[i], "ul", depth + 1))
                i += 1
            lines.append(f"{indent}</ul>\n")
            continue

        if btype == "numbered_list_item":
            lines.append(f"{indent}<ol>\n")
            while i < len(blocks) and blocks[i].get("type") == "numbered_list_item":
                lines.append(_list_item_to_html(blocks[i], "ol", depth + 1))
                i += 1
            lines.append(f"{indent}</ol>\n")
            continue

        lines.append(_block_to_html(b, depth=depth))
        i += 1

    return "".join(lines)


# ---------------------------------------------------------------------------
# 4.  METADATA EXTRACTION
# ---------------------------------------------------------------------------

def _extract_meta(meta: dict) -> dict:
    """Pulls title, cover, icon, created/edited time from page metadata."""
    props = meta.get("properties", {})

    title = ""
    for prop in props.values():
        if prop.get("type") == "title":
            title = _rich_text_to_html(prop.get("title", []))
            break

    tags = []
    for prop in props.values():
        if prop.get("type") == "multi_select":
            tags = [t["name"] for t in prop.get("multi_select", [])]
            break
        if prop.get("type") == "select" and prop.get("select"):
            tags = [prop["select"]["name"]]
            break

    cover = ""
    if meta.get("cover"):
        ctype = meta["cover"].get("type", "external")
        cover = meta["cover"].get(ctype, {}).get("url", "")

    icon = ""
    if meta.get("icon") and meta["icon"].get("type") == "emoji":
        icon = meta["icon"]["emoji"]

    return {
        "title": title or "Untitled",
        "tags": tags,
        "cover": cover,
        "icon": icon,
        "created": meta.get("created_time", ""),
        "edited": meta.get("last_edited_time", ""),
    }


def _estimate_read_time(blocks: list) -> int:
    """Estimated reading time in minutes at 238 wpm."""
    def _count_words(blocks: list) -> int:
        total = 0
        for b in blocks:
            btype = b.get("type", "")
            for rt in b.get(btype, {}).get("rich_text", []):
                total += len(rt.get("plain_text", "").split())
            total += _count_words(b.get("_children", []))
        return total

    return max(1, math.ceil(_count_words(blocks) / 238))


# ---------------------------------------------------------------------------
# 5.  HTML TEMPLATE
# ---------------------------------------------------------------------------

_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{title}</title>
  <meta name="description" content="{title}">

  <!-- Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,600;1,400&family=Source+Sans+3:wght@400;600&display=swap" rel="stylesheet">

  <!-- Syntax highlighting -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
  <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>

  <style>
    /* ── Reset & Base ── */
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
      font-family: var(--serif);
      color: var(--ink);
      background: var(--bg);
      line-height: 1.8;
      -webkit-font-smoothing: antialiased;
    }}

    /* ── Progress bar ── */
    #progress-bar {{
      position: fixed; top: 0; left: 0;
      height: 3px; width: 0%;
      background: var(--accent);
      z-index: 1000;
      transition: width 0.1s linear;
    }}

    /* ── Top nav ── */
    nav.top-bar {{
      position: sticky; top: 0; z-index: 900;
      background: rgba(255,255,255,0.92);
      backdrop-filter: blur(8px);
      border-bottom: 1px solid var(--border);
      padding: 0 2rem;
      height: 56px;
      display: flex; align-items: center; justify-content: space-between;
    }}
    .nav-logo {{
      font-family: var(--sans);
      font-weight: 600; font-size: 1.15rem;
      color: var(--ink); text-decoration: none;
      letter-spacing: -0.02em;
    }}
    .nav-actions {{
      display: flex; gap: 1rem; align-items: center;
      font-family: var(--sans); font-size: 0.85rem; color: var(--ink-muted);
    }}
    .nav-actions .btn-follow {{
      background: var(--ink); color: #fff;
      border: none; border-radius: 100px;
      padding: 0.4rem 1rem; font-family: var(--sans);
      font-size: 0.82rem; cursor: pointer;
    }}
    .nav-actions .btn-follow:hover {{ background: #333; }}

    /* ── Cover ── */
    .cover-image {{
      width: 100%; max-height: 480px;
      object-fit: cover; display: block;
    }}

    /* ── Article wrapper ── */
    article {{
      max-width: var(--max-w);
      margin: 0 auto;
      padding: 3rem 1.5rem 6rem;
    }}

    /* ── Header block ── */
    .article-header {{ margin-bottom: 2.5rem; }}

    .article-tags {{
      display: flex; gap: 0.5rem; flex-wrap: wrap;
      margin-bottom: 1.2rem;
    }}
    .tag {{
      font-family: var(--sans); font-size: 0.75rem; font-weight: 600;
      letter-spacing: 0.05em; text-transform: uppercase;
      color: var(--accent); border: 1px solid var(--accent);
      border-radius: 100px; padding: 0.2rem 0.7rem;
    }}

    .article-title {{
      font-family: var(--serif);
      font-size: clamp(2rem, 5vw, 2.7rem);
      font-weight: 600; line-height: 1.2;
      letter-spacing: -0.02em;
      color: var(--ink);
      margin-bottom: 1rem;
    }}

    .article-meta {{
      display: flex; align-items: center; gap: 0.75rem;
      font-family: var(--sans); font-size: 0.88rem;
      color: var(--ink-muted);
      border-top: 1px solid var(--border);
      border-bottom: 1px solid var(--border);
      padding: 1rem 0;
      margin-bottom: 2.5rem;
    }}
    .avatar {{
      width: 42px; height: 42px; border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-weight: 600; font-size: 1rem;
      flex-shrink: 0; font-family: var(--sans);
      object-fit: cover;
    }}
    .meta-right {{ display: flex; flex-direction: column; gap: 0.1rem; }}
    .meta-author {{ font-weight: 600; color: var(--ink); }}
    .meta-details {{ color: var(--ink-muted); font-size: 0.82rem; }}
    .meta-sep {{ color: var(--ink-faint); }}

    /* ── Body typography ── */
    p {{ margin-bottom: 1.5rem; }}

    h1, h2, h3 {{
      font-family: var(--serif);
      font-weight: 600; line-height: 1.25;
      letter-spacing: -0.02em;
      color: var(--ink);
    }}
    h1 {{ font-size: 1.9rem; margin: 2.5rem 0 1rem; }}
    h2 {{ font-size: 1.5rem; margin: 2.2rem 0 0.8rem; }}
    h3 {{ font-size: 1.2rem; margin: 1.8rem 0 0.6rem; }}

    a {{ color: inherit; text-decoration: underline; text-underline-offset: 3px; }}
    a:hover {{ color: var(--accent); }}

    strong {{ font-weight: 600; }}
    em {{ font-style: italic; }}

    blockquote {{
      border-left: 3px solid var(--ink);
      padding: 0.2rem 0 0.2rem 1.5rem;
      margin: 2rem 0;
      font-size: 1.2rem;
      font-style: italic;
      color: var(--ink-muted);
    }}

    ul, ol {{ margin: 1rem 0 1.5rem 1.5rem; }}
    li {{ margin-bottom: 0.4rem; }}
    li + li {{ margin-top: 0.2rem; }}

    hr {{
      border: none;
      height: 1px; background: var(--border);
      margin: 3rem auto; width: 80%;
    }}

    /* ── Code ── */
    code {{
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.82em;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      border-radius: 3px; padding: 0.1em 0.35em;
    }}

    .code-block {{
      margin: 2rem 0;
      background: #f6f8fa;
      border: 1px solid var(--border);
      border-radius: 8px; overflow: hidden;
    }}
    .code-block pre {{
      margin: 0; padding: 1.2rem 1.4rem;
      overflow-x: auto; font-size: 0.85rem; line-height: 1.6;
    }}
    .code-block pre code {{
      background: none; border: none; padding: 0; font-size: inherit;
    }}
    .code-block figcaption {{
      font-family: var(--sans); font-size: 0.78rem;
      color: var(--ink-muted); text-align: center;
      padding: 0.5rem; border-top: 1px solid var(--border);
    }}

    /* ── Video ── */
    .video-block {{ margin: 2rem 0; }}
    .video-block iframe {{
      width: 100%; aspect-ratio: 16/9; border: none; border-radius: 6px;
    }}

    /* ── Callout ── */
    .callout {{
      display: flex; gap: 0.75rem; align-items: flex-start;
      border-radius: 6px; padding: 1rem 1.2rem;
      margin: 1.5rem 0;
      background: var(--bg-subtle);
      border: 1px solid var(--border);
      font-family: var(--sans); font-size: 0.95rem;
    }}
    .callout-icon {{ font-size: 1.2rem; flex-shrink: 0; margin-top: 0.1rem; }}

    /* ── To-do ── */
    label.todo {{
      display: flex; align-items: center; gap: 0.5rem;
      margin: 0.4rem 0; font-family: var(--sans);
    }}
    label.todo input {{ accent-color: var(--accent); }}

    /* ── Toggle ── */
    details.toggle {{
      border: 1px solid var(--border);
      border-radius: 6px; padding: 0.6rem 1rem; margin: 0.8rem 0;
      font-family: var(--sans);
    }}
    details.toggle summary {{ cursor: pointer; font-weight: 600; }}

    /* ── Bookmark ── */
    .bookmark {{
      border: 1px solid var(--border); border-radius: 6px;
      padding: 0.75rem 1rem; margin: 1.2rem 0;
      font-family: var(--sans); font-size: 0.9rem;
      word-break: break-all;
    }}

    /* ── Column layout ── */
    .column-list {{ display: flex; gap: 1.5rem; margin: 1.5rem 0; }}
    .column {{ flex: 1; min-width: 0; }}

    /* ── Highlight colors ── */
    .highlight-yellow  {{ background: #fef9c3; }}
    .highlight-blue    {{ background: #dbeafe; }}
    .highlight-green   {{ background: #dcfce7; }}
    .highlight-red     {{ background: #fee2e2; }}
    .highlight-purple  {{ background: #ede9fe; }}
    .highlight-pink    {{ background: #fce7f3; }}
    .highlight-orange  {{ background: #ffedd5; }}

    /* ── Footer ── */
    footer {{
      border-top: 1px solid var(--border);
      padding: 2rem 1.5rem;
      max-width: var(--max-w);
      margin: 0 auto;
      font-family: var(--sans); font-size: 0.85rem;
      color: var(--ink-muted);
      display: flex; justify-content: space-between; align-items: center;
      flex-wrap: wrap; gap: 0.5rem;
    }}

    /* ── Responsive ── */
    @media (max-width: 600px) {{
      article {{ padding: 2rem 1.2rem 4rem; }}
      .article-title {{ font-size: 1.8rem; }}
    }}
  </style>
</head>
<body>
  <div id="progress-bar"></div>

  <nav class="top-bar">
    <a class="nav-logo" href="#">Notohub</a>
    <div class="nav-actions">
      <span>{read_time} min read</span>
      <button class="btn-follow">Follow</button>
    </div>
  </nav>

  {cover_html}

  <article>
    <header class="article-header">
      {tags_html}
      <h1 class="article-title">{title}</h1>
    </header>

    <div class="article-meta">
      {avatar_html}
      <div class="meta-right">
        <span class="meta-author">{author_name}</span>
        <span class="meta-details">
          {date_str}
          <span class="meta-sep"> · </span>
          {read_time} min read
        </span>
      </div>
    </div>

    {body}
  </article>

  <footer>
    <span>Written with Notion</span>
    <span>Last edited {edited_str}</span>
  </footer>

  <script>
    window.addEventListener("scroll", () => {{
      const el = document.documentElement;
      const pct = (el.scrollTop / (el.scrollHeight - el.clientHeight)) * 100;
      document.getElementById("progress-bar").style.width = pct + "%";
    }});

    document.addEventListener("DOMContentLoaded", () => hljs.highlightAll());
  </script>
</body>
</html>
"""


def _render_html(page_data: dict, author: str) -> str:
    """Assembles the final HTML string from page data. Returns HTML string."""
    meta_raw = page_data["meta"]
    blocks   = page_data["blocks"]

    m = _extract_meta(meta_raw)
    read_time = _estimate_read_time(blocks)

    cover_html = ""

    tags_html = ""
    if m["tags"]:
        tags_html = '<div class="article-tags">' + "".join(
            f'<span class="tag">{t}</span>' for t in m["tags"]
        ) + "</div>"

    initial = author[0].upper() if author else "?"
    avatar_html = f'<div class="avatar">{initial}</div>'
    author_name = author or "Unknown Author"

    date_str = datetime.now().strftime("%b %d, %Y")

    def _fmt_date(iso: str) -> str:
        try:
            dt = datetime.fromisoformat(iso.replace("Z", "+00:00"))
            return dt.strftime("%b %d, %Y")
        except Exception:
            return iso[:10]

    edited_str = _fmt_date(m["edited"]) if m["edited"] else date_str
    body = _blocks_to_html(blocks)

    return _HTML_TEMPLATE.format(
        title=m["title"],
        cover_html=cover_html,
        tags_html=tags_html,
        avatar_html=avatar_html,
        author_name=author_name,
        date_str=date_str,
        edited_str=edited_str,
        read_time=read_time,
        body=body,
    )


# ---------------------------------------------------------------------------
# 6.  PUBLIC ENTRY POINTS
# ---------------------------------------------------------------------------

def render_page_data(page_data: dict, author: str) -> str:
    """
    Render pre-fetched page data to HTML without making another API call.
    Use this when you already have the result of fetch_notion_page() and
    want to avoid a redundant round-trip to Notion.
    """
    return _render_html(page_data, author=author)


def page_id_to_html(
    page_id: str,
    auth_fn: Callable[[], dict],
    author: str = "Unknown Author",
) -> str:
    """
    Fetch a Notion page by ID and return a styled HTML string.

    Args:
        page_id:  32-char Notion page ID (no dashes).
        auth_fn:  Zero-argument callable returning HTTP headers dict.
                  Use token_auth("secret_...") or env_auth() for now;
                  swap for an OAuth factory when moving to public connections.
        author:   Author display name shown in the article byline.

    Returns:
        Complete HTML document as a string.
    """
    page_data = fetch_notion_page(page_id, auth_fn)
    return _render_html(page_data, author=author)


def notion_to_html(
    url: str,
    auth_fn: Callable[[], dict],
    author: str = "Unknown Author",
) -> str:
    """
    Convert a Notion page URL to a styled HTML string.

    Accepts any Notion URL format. Delegates to page_id_to_html().

    Args:
        url:     Full Notion page URL.
        auth_fn: Auth-header factory (see token_auth / env_auth).
        author:  Author display name.

    Returns:
        Complete HTML document as a string.
    """
    page_id = _extract_page_id(url)
    return page_id_to_html(page_id, auth_fn, author=author)


# ---------------------------------------------------------------------------
# 7.  CLI  (python -m lib.notion_to_html <url> [author])
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    import sys

    if len(sys.argv) < 2:
        print("Usage: python notion_to_html.py <notion-url> [author]")
        print("       NOTION_API_KEY must be set in the environment.")
        sys.exit(1)

    notion_url = sys.argv[1]
    author_arg = sys.argv[2] if len(sys.argv) > 2 else "Unknown Author"

    html = notion_to_html(notion_url, env_auth(), author=author_arg)

    out_path = "index.html"
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(html)
    print(f"✓  Saved → {out_path}")
