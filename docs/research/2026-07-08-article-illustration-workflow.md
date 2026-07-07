# Article Illustration Workflow Research

Date: 2026-07-08

## Question

How should this blog keep a maintainable article illustration workflow, with the option to create Tw93/Kami-style drawings when a post needs a more polished figure?

Reference article: <https://tw93.fun/2026-05-01/ai-visibility.html>

## Local Findings

- The reference article uses externally hosted PNG images in the article source, not inline SVGs in the published Markdown.
- The visual style aligns with the public Kami design system: parchment background, ink-blue accent, warm grays, serif-led hierarchy, restrained geometric diagrams.
- This repo has 151 Markdown image references across 65 files; 147 of those references have empty alt text.
- The weakest local pattern is the use of very tall private mind-map screenshots as article illustrations. Examples include RAG and AI-Agent images over 10,000px high. They are useful source material, but do not always need to be replaced immediately.
- The current renderer accepts raw HTML in Markdown, so `<figure><img><figcaption>...</figcaption></figure>` can be used immediately. CSS currently styles `.prose img`, but not `figure` / `figcaption`.

## Tooling Investigated

### Kami

Source: <https://github.com/tw93/Kami>

Kami is the closest match to the reference article. It is a Skill/design system with a specific visual language: warm parchment `#f5f4ed`, ink blue `#1B365D`, warm neutral grays, serif typography, simple line geometry, no gradients, no hard shadows, and tight editorial rhythm.

GitHub API snapshot on 2026-07-08:

- Stars: 9,580
- Forks: 449
- Recently pushed: 2026-07-05

Fit for this repo: use as the design constraint and authoring guide, not as a runtime dependency.

### Mermaid CLI

Sources:

- <https://github.com/mermaid-js/mermaid-cli>
- <https://mermaid.ai/open-source/config/mermaidCLI.html>

Mermaid CLI renders Mermaid definitions to SVG, PNG, or PDF. It is mature and useful for simple flows, state diagrams, sequence diagrams, and dependency diagrams.

GitHub API snapshot on 2026-07-08:

- Stars: 4,805
- Forks: 380
- Recently pushed: 2026-07-06

Fit for this repo: useful supporting source format for some diagrams, but its default visual output should be themed or post-processed before publishing.

### D2

Sources:

- <https://d2lang.com/>
- <https://d2lang.com/tour/exports/>
- <https://github.com/terrastruct/d2>

D2 is a text-to-diagram language with CLI export to SVG, PNG, and PDF. SVG is the default export format. It has strong ergonomics for architecture diagrams and structured system diagrams.

GitHub API snapshot on 2026-07-08:

- Stars: 24,630
- Forks: 699
- Recently pushed: 2026-04-24

Fit for this repo: strong candidate for architecture/network diagrams when source text is more maintainable than hand-authored SVG.

### Graphviz

Sources:

- <https://graphviz.org/doc/info/command.html>
- <https://graphviz.org/docs/outputs/svg/>

Graphviz is mature for graph layout and can output SVG using `dot -Tsvg input.dot`. It also supports `svg_inline` for header-less SVG suitable for inline HTML in newer versions.

Fit for this repo: useful only when automatic graph layout is the point. For editorial blog figures, it often produces an overly mechanical look unless heavily styled.

### Excalidraw

Sources:

- <https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api>
- <https://docs.excalidraw.com/docs/@excalidraw/excalidraw/api/utils/export>
- <https://github.com/excalidraw/excalidraw>

Excalidraw has official export utilities for SVG/PNG and is extremely popular.

GitHub API snapshot on 2026-07-08:

- Stars: 126,930
- Forks: 14,290
- Recently pushed: 2026-07-07

Fit for this repo: excellent for sketching and whiteboarding, but the hand-drawn style does not match the Tw93/Kami reference. Use only as source material, not as the final look.

### Satori

Source: <https://github.com/vercel/satori>

Satori converts JSX/HTML-like layout to SVG, handling layout, font, and typography. It is popular and useful for repeatable cards or Open Graph-style editorial images.

GitHub API snapshot on 2026-07-08:

- Stars: 13,617
- Forks: 353
- Recently pushed: 2026-07-02

Fit for this repo: useful if the workflow needs reusable image templates, but less natural for technical diagrams than direct SVG/HTML diagram templates.

### resvg-js

Source: <https://github.com/thx/resvg-js>

resvg-js converts SVG to PNG and supports scaling, cropping, background color, system fonts, and custom fonts.

GitHub API snapshot on 2026-07-08:

- Stars: 1,953
- Forks: 76
- Recently pushed: 2026-06-30

Fit for this repo: strong renderer if the source of truth is SVG and the published asset should also include PNG.

### SVGO

Source: <https://github.com/svg/svgo>

SVGO is a Node.js CLI/library for optimizing SVG files.

GitHub API snapshot on 2026-07-08:

- Stars: 22,569
- Forks: 1,451
- Recently pushed: 2026-07-05

Fit for this repo: strong optimizer for committed SVG outputs.

### Playwright

Source: <https://playwright.dev/docs/screenshots>

Playwright can capture screenshots, including full-page screenshots, and is already a dev dependency in this repo.

GitHub API snapshot on 2026-07-08:

- Stars: 92,369
- Forks: 6,052
- Recently pushed: 2026-07-07

Fit for this repo: useful for visual QA and rendering HTML/SVG previews to PNG without adding a new browser automation dependency.

## Recommendation

Use a hybrid source-first workflow for new or intentionally redrawn figures:

1. Adopt Kami as the visual language.
2. Keep editable illustration sources in the repo, under an article-adjacent source directory.
3. Prefer hand-authored HTML/SVG templates for final editorial figures.
4. Use D2 or Mermaid only when text-to-diagram structure is more maintainable than manual SVG.
5. Use AI image generation only for non-technical cover/hero illustrations, not for diagrams that need future edits.
6. Publish SVG where possible; render PNG fallbacks only when needed.
7. Keep old pictures when they are good enough or historically useful; use figure blocks with meaningful alt text and visible captions when a post receives an intentional redraw.

Suggested source layout:

```text
content/zh/assets/posts/<slug>/
  illustration-src/
    rag-pipeline.svg
    rag-pipeline.md
  rag-pipeline.svg
  rag-pipeline.png
```

Candidate posts for future redraws, if the author decides an image needs replacement:

- `20250220-rag-application-development.md`
- `20250221-ai-agent-development-notes.md`
- `20241226-llm-technology-overview.md`
- `20250106-ai-and-math-basics.md`
- `20260419-anthropic-skill-vs-openai-agent-sdk.md`

This list is a backlog, not a requirement. Existing article pictures can stay in place until there is a clear editorial reason to redraw them.
