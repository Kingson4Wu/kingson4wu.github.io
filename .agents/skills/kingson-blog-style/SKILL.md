---
name: kingson-blog-style
description: >-
  Create, rewrite, refine, or batch-rewrite Kingson Wu's Chinese blog posts in
  a professional version of his personal style. Use for drafting new technical,
  workplace, reading-note, AI, architecture, debugging, or reflection articles;
  removing AI tone from 2025-2026 posts; improving older posts; preserving the
  author's viewpoint while making structure, hierarchy, transitions, and prose
  cleaner. Trigger phrases include 写博客, 改文章, 重写博客, 批量改文章, 去 AI 味,
  AI 味太重, rewrite article, blog writing, refine post.
---

# Kingson Blog Style

Use this skill to write or rewrite Chinese blog posts so they sound like Kingson Wu, but with cleaner structure and less note-like or AI-generated prose.

## Core Goal

Preserve the author's pragmatic, direct, experience-driven voice while improving the article into a finished blog post.

The result should feel like:

- the same author and viewpoint,
- clearer hierarchy than older posts,
- less AI tone than many 2025-2026 drafts,
- more professional and elegant without becoming ornate.

## Required References

Load references based on task mode:

- Always load `references/style-profile.md`.
- For new posts or single-article rewrites, load `references/article-types.md`.
- For batch rewrites, load `references/batch-rewrite.md`.
- For AI-tone cleanup or old-post modernization, load `references/rewrite-rules.md`.
- When checking quality, load `examples/anti-patterns.md`.
- When needing tone calibration, load `examples/good-patterns.md`.

## Modes

Determine mode from the user request:

- **New draft**: create a new post from a topic, notes, or outline.
- **Single rewrite**: rewrite one existing article.
- **Partial refinement**: improve a section or paragraph.
- **Batch rewrite**: modify many posts in a date range, folder, or file list.
- **AI-tone cleanup**: remove generic AI prose while preserving the author's ideas.

If the user asks to batch rewrite 2025-2026 posts, assume the goal is a visible rewrite into finished blog prose, not a conservative copyedit, unless they explicitly request conservative edits.

## Execution Workflow

1. Identify the mode, article scope, and article type.
2. Read the required references for that mode.
3. Preserve frontmatter, slugs, dates, tags, images, code blocks, links, and technical facts unless the user explicitly asks to change them.
4. Identify the central claim or practical reason the article exists.
5. Rewrite structure before polishing sentences.
6. Prefer paragraphs over bullet piles.
7. Keep lists only for steps, comparisons, taxonomies, checklists, commands, or naturally grouped items.
8. Remove AI-style abstraction, generic uplift, and neutral filler.
9. Keep Chinese as the default output language.
10. Verify the final text against `examples/anti-patterns.md` before finishing.

## Non-Negotiables

- Do not turn the author's voice into a generic AI explainer.
- Do not invent personal experiences, technical incidents, dates, or conclusions.
- Do not remove useful roughness if it carries the author's judgment.
- Do not preserve weak old structure just because it is historically authentic.
- Do not use motivational endings unless the source article genuinely demands one.
- Do not write textbook definitions unless the article needs them for a later practical judgment.
- Do not switch to English unless the user explicitly requests it.

## Output Rules

For direct writing tasks, output the complete article.

For repository editing tasks:

- Edit files in place.
- Keep changes scoped to the requested articles and skill resources.
- Report which files changed and what kind of rewrite was applied.
- Mention any files intentionally skipped and why.

## Quality Check

Before finalizing, verify:

- The article has a clear reason to exist.
- The author has an explicit viewpoint.
- The structure moves from concrete trigger to analysis to judgment.
- AI-sounding paragraphs have been replaced with concrete reasoning.
- The ending lands on a practical conclusion, not a slogan.
