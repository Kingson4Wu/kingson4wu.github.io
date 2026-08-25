# Visual Diagrams

Use this reference when a Chinese blog post needs diagrams, charts, SVG images, or explanatory visuals.

## Default Diagram Direction

For technical explanation posts, prefer a restrained editorial diagram style inspired by Tw93's AI visibility article:

- Warm paper background: `#fbf7ef`.
- Deep blue primary ink: `#173f63`.
- Off-white cards or panels: `#fffdf8`.
- Thin deep-blue strokes, usually `1.2-1.5` for boxes and axes.
- Low-saturation accents only when they encode meaning:
  - Muted red: `#9a3b2f` for contrast, warning, reverse motion, or release.
  - Muted green: `#1f7a57` for stable/default/classic paths.
  - Desaturated blue-gray: `#89a6bd` or `#6f7f8d` for secondary marks.
- Prefer serif-like title typography in SVGs: `Georgia, 'Times New Roman', serif`.
- Use simple line art, cards, numbered rows, arrows, brackets, and labels over decorative illustration.

The diagram should feel like a clean technical note printed on paper: calm, readable, slightly editorial, and not like a generic SaaS dashboard.

## When To Use SVG

Use SVG when the visual explains spatial, causal, or structural relationships:

- Flow or roadmap diagrams.
- Two-view comparisons.
- Timeline or path diagrams.
- Concept maps.
- Physics, architecture, networking, or system-shape explanations.

Keep plain `text` code blocks for short summaries, equations, condition checks, command-like examples, or compact before/after snippets. Do not replace every ASCII block with an image.

## Layout Rules

- Avoid text overlapping lines, arrows, plotted curves, dots, or card borders.
- Give every label its own stable space. If a label describes a line or arrow, place it beside the visual element, not on top of it.
- Leave larger margins than seem necessary; diagrams are rendered inside article columns and must survive mobile scaling.
- Use a single clear title inside the SVG. Keep labels short.
- Use `<figure>` with `<img>` and `<figcaption>` in Markdown/HTML, rather than a bare image.
- Include useful `alt`, `title`, and `desc` text in SVGs.
- Keep diagrams scoped to the article assets directory, for example `content/zh/assets/posts/<slug>/`.

## Quality Bar

Before finishing a diagram-heavy post:

- Build or preview the article in the browser.
- Screenshot diagrams at desktop and mobile widths.
- Check for overlap, cramped labels, uneven spacing, illegible text, inconsistent palette, and labels that no longer match the article.
- Fix the SVG if the screenshot is not clean. Do not rely on source inspection alone.

## What To Avoid

- Bright default blue/orange palettes unless the article already uses that identity.
- Dense decorative cards, gradient blobs, shadows, or marketing-style infographics.
- Mixing many unrelated colors in one diagram.
- Labels placed directly on top of lines or arrows.
- English titles that obscure the Chinese article's meaning. English labels are acceptable when they act as compact diagram headings, but Chinese explanatory labels should remain clear.
