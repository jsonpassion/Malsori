#!/usr/bin/env python3
"""Render privacy.md and terms.md into docs/privacy.html and docs/terms.html.

    python3 tools/build_pages.py

The policies are edited as Markdown at the repo root; the site serves the HTML. Only the
Markdown these two files use is handled: #/##/### headings, paragraphs, "- " lists, **bold**,
[text](url) links and --- rules.
"""
import html
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PAGES = {"privacy.md": ("privacy.html", "Privacy Policy"), "terms.md": ("terms.html", "Terms of Service")}

TEMPLATE = """<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Malsori — {title}</title>
<link rel="icon" href="assets/icon-180.png" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&display=swap" rel="stylesheet" />
<link rel="stylesheet" href="styles.css" />
</head>
<body>
<nav class="nav">
  <div class="wrap nav-inner">
    <a class="brand" href="./"><img src="assets/icon-180.png" alt="" />Malsori</a>
    <div class="nav-links">
      <a href="privacy.html" class="keep">Privacy</a>
      <a href="terms.html" class="keep">Terms</a>
    </div>
  </div>
</nav>
<main class="doc"><div class="sheet">
{body}
</div></main>
</body>
</html>
"""


def inline(text: str) -> str:
    text = html.escape(text, quote=False)
    text = re.sub(r"\*\*(.+?)\*\*", r"<strong>\1</strong>", text)
    text = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: f'<a href="{html.escape(m.group(2), quote=True)}">{m.group(1)}</a>', text)
    return text


def render(markdown: str) -> str:
    out, para, items = [], [], []

    def flush():
        nonlocal para, items
        if para:
            out.append("<p>" + "<br />".join(inline(line) for line in para) + "</p>")
            para = []
        if items:
            out.append("<ul>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ul>")
            items = []

    for raw in markdown.splitlines():
        line = raw.rstrip()
        if not line:
            flush()
        elif line.startswith("### "):
            flush(); out.append(f"<h3>{inline(line[4:])}</h3>")
        elif line.startswith("## "):
            flush(); out.append(f"<h2>{inline(line[3:])}</h2>")
        elif line.startswith("# "):
            flush(); out.append(f"<h1>{inline(line[2:])}</h1>")
        elif line.startswith("- "):
            if para:
                flush()
            items.append(line[2:])
        elif line.strip() == "---":
            flush()
        else:
            if items:
                flush()
            para.append(line)
    flush()
    return "\n".join(out)


def main():
    for source, (target, title) in PAGES.items():
        body = render((ROOT / source).read_text(encoding="utf-8"))
        (ROOT / "docs" / target).write_text(TEMPLATE.format(title=title, body=body), encoding="utf-8")
        print(f"{source} → docs/{target}")


if __name__ == "__main__":
    main()
