# Batch Rewrite Workflow

Use this when the user asks to rewrite many posts, especially 2025-2026 articles with AI tone.

## Scope Discovery

1. Identify target files from the user's date range, folder, or explicit list.
2. Exclude generated HTML, feeds, indexes, search artifacts, and assets.
3. Work from source Markdown under `content/`.
4. Do not modify unrelated years or languages unless requested.

For this blog, Chinese posts usually live in:

- `content/zh/posts/`
- `content/zh/notes/`

## Inventory First

Before editing, create an internal inventory:

- file path,
- title,
- date,
- rough article type,
- AI-tone severity: light, medium, heavy,
- rewrite risk: low, medium, high.

Do not create a permanent inventory file unless the user asks for one.

## Severity Guide

- **Light**: mostly author's voice; fix a few generic phrases, weak endings, and transitions.
- **Medium**: useful content but obvious AI paragraphs; rewrite sections and transitions.
- **Heavy**: AI-generated structure dominates; rebuild around the author's likely viewpoint while preserving facts.

## Risk Guide

- **Low**: opinion, workplace reflection, personal observation.
- **Medium**: architecture or AI concept explanation with source links.
- **High**: math-heavy, protocol-heavy, code-heavy, or precise technical claims.

For high-risk articles, rewrite conservatively and avoid changing technical meaning.

## Edit Order

1. Process one file at a time.
2. Preserve frontmatter exactly unless a field is malformed.
3. Preserve images and code blocks unless obviously broken.
4. Rewrite body structure and prose.
5. Keep references, but do not let `## Reference` be the only conclusion if the article needs a takeaway.
6. Review the diff before moving to the next file when changes are large.

## Batch Defaults

When the user approves the recommended approach for 2025-2026 cleanup:

- prefer visible rewrite into finished blog prose,
- remove AI tone aggressively,
- keep the author's conclusions and technical facts,
- keep article scope stable,
- do not split or merge posts unless requested.

## Verification

After editing:

- Run the repository's content check or build command if available.
- Inspect `git diff --stat`.
- Spot-check representative diffs across severity levels.
- Report changed files grouped by rewrite level.

For this repo, prefer:

```bash
npm run check
npm run build
```

Use the available package scripts rather than inventing new validation.
