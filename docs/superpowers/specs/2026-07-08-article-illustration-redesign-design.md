# Article Illustration Workflow Design

## Context

The blog has many article images that were migrated from older posts or personal notes. A few recent AI articles use very tall mind-map screenshots as the primary illustration. Those images contain useful raw material, and they can stay when preserving the original picture is the better editorial choice.

The visual reference is Tw93's AI visibility article:

<https://tw93.fun/2026-05-01/ai-visibility.html>

The article source uses hosted PNG assets, but the visual language aligns with Tw93's public Kami design system: warm parchment, ink-blue accent, warm grays, serif hierarchy, restrained geometric diagrams, and editorial captions.

Local audit:

- 151 Markdown image references across 65 files.
- 147 image references have empty alt text.
- Current Markdown rendering allows raw HTML, so article authors can use `<figure>`, `<img>`, and `<figcaption>` immediately.
- CSS currently styles `.prose img`, but not `figure` or `figcaption`.

Research details are captured in:

`docs/research/2026-07-08-article-illustration-workflow.md`

## Goal

Create a maintainable first-pass workflow for article illustrations in a polished Kami/Tw93-inspired style, without requiring existing posts to replace their current pictures.

The outcome should make article figures:

- More readable in the article flow when a redraw is intentionally made.
- Visually consistent with the blog and the reference style.
- Editable in the repo after publication.
- Accessible through meaningful alt text and visible captions.
- Repeatable for future posts without requiring a full image-system rebuild.

## Non-Goals

- Do not redesign every historical image in this pass.
- Do not replace technical diagrams with one-off AI-generated raster images.
- Do not introduce a large design framework or general-purpose blog image platform.
- Do not require external paid image APIs.
- Do not delete or replace old images unless the author explicitly chooses a redraw for that article.
- Do not rewrite article prose except the minimum needed around image captions and figure references.

## Chosen Approach

Use **Lightweight Pipeline + Optional Redraws**.

This means:

1. Establish source and output conventions for article figures.
2. Add lightweight CSS for article figures and captions.
3. Add a small image audit/check command.
4. Keep hand-authored Kami-style SVG available as the preferred drawing method for future article figures.
5. Use Mermaid or D2 only when text-to-diagram source is more maintainable than direct SVG.
6. Use AI image generation only as optional source material for non-technical cover art, not for diagrams that need future edits.

## Visual Language

Use the Kami/Tw93 visual language as a constraint system:

- Background: parchment `#f5f4ed`, never pure white for authored editorial figures.
- Accent: ink blue `#1B365D`, used sparingly for the focal path or focal node.
- Neutrals: warm grays only.
- Typography: serif labels where practical, with CJK-capable fallback.
- Geometry: simple flat boxes, lines, arrows, and icons.
- Depth: minimal or none; avoid hard shadows.
- No gradients, 3D effects, decorative blobs, or generic stock-like imagery.
- One figure explains one idea.

## Asset Convention

For each redesigned article figure, keep editable sources next to the article's assets:

```text
content/zh/assets/posts/<slug>/
  illustration-src/
    <figure-name>.svg
    <figure-name>.md
  <figure-name>.svg
  <figure-name>.png
```

Rules:

- `illustration-src/` contains editable source files and design notes.
- Published SVGs live beside existing article assets so the current static copy logic continues to work.
- PNG fallback is optional and should be generated only when needed for compatibility or social sharing.
- Existing original images remain until the replacement has shipped.

## Markdown Convention

When a post receives a new or redrawn figure, prefer replacing bare image syntax:

```md
![](/assets/zh/posts/20250220/RAG.png)
```

with figure blocks:

```html
<figure>
  <img src="/assets/zh/posts/20250220/rag-pipeline.svg" alt="RAG pipeline from user question through retrieval, reranking, grounding, and answer generation">
  <figcaption>RAG is useful when retrieval changes the context the model sees before generation.</figcaption>
</figure>
```

Caption rules:

- The visible caption states the insight, not just the object name.
- `alt` text describes the structure for screen readers.
- Captions should be concise and article-specific.

## Lightweight Pipeline

Add a small script layer rather than a full image platform.

Initial commands:

- `npm run check`: continue validating content.
- Add an image audit script or extend content checks to report:
  - empty image alt text,
  - missing local image targets,
  - unusually tall image dimensions,
  - raw image references that should become figures.

Potential future commands, only if needed after the pilot:

- `npm run images:check`
- `npm run images:render`

Rendering should prefer existing dependencies where possible. Playwright is already available and can verify rendered pages. SVGO or resvg-js can be added later if SVG optimization or PNG rendering becomes a repeated need.

## Candidate Redraw Backlog

Recent AI/LLM articles are good candidates if the author later decides to redraw their images. They are not required to change now.

Primary batch:

- `content/zh/posts/20250220-rag-application-development.md`
- `content/zh/posts/20250221-ai-agent-development-notes.md`
- `content/zh/posts/20241226-llm-technology-overview.md`
- `content/zh/posts/20260419-anthropic-skill-vs-openai-agent-sdk.md`

Optional fifth article if the pattern is stable:

- `content/zh/posts/20250106-ai-and-math-basics.md`

Possible future redraws:

- RAG article: replace one tall mind map with 2-3 smaller figures, such as RAG pipeline, RAG vs fine-tuning, and retrieval quality loop.
- AI Agent article: replace the tall mind map with a compact capability stack: planning, memory, tools, action, and feedback.
- LLM overview: split broad overview images into focused figures, such as training path and application/runtime layer map.
- Skill comparison: restyle existing diagrams into the Kami palette and simplify text density where needed.

## Implementation Plan Shape

The later implementation plan should proceed in this order:

1. Add figure/caption CSS and verify existing articles still render normally.
2. Add image audit checks with warnings first, not hard failures.
3. Keep old article images unless a specific redraw is requested.
4. When a redraw is requested, create the SVG source next to the article assets and update only that article.
5. Run `npm run check`, `npm run build`, and targeted browser screenshots before handoff.

## Verification

A new or redrawn figure is complete when:

- The editable source is committed under `illustration-src/`.
- The published asset is referenced by the article, or the original article image intentionally remains in place.
- The article uses a `<figure>` block with alt text and a visible caption.
- The figure fits mobile and desktop article width without awkward overflow.
- The image viewer still works for the published image.
- `npm run check` and `npm run build` pass.
- A browser screenshot confirms that text, captions, and figure spacing look polished.

## Risks

- Direct hand-authored SVG can become slow if every figure is built from scratch. Mitigation: keep a small reusable figure template after the first two diagrams.
- Text-heavy source images may tempt one-to-one redraws. Mitigation: one figure explains one idea; long mind maps should be split or summarized.
- Adding SVG/PNG rendering dependencies too early may overcomplicate the repo. Mitigation: begin with static SVG and add render tooling only when repeated work justifies it.
- Existing old posts will still have rough images. Mitigation: leave them alone until there is a clear editorial reason to redraw a specific figure.

## Approval

Approved direction: Lightweight Pipeline + Optional Redraws.

The next step is to write a detailed implementation plan before editing production article files or site code.
