# AGENTS.md

## Content Source Of Truth

This repository is a static blog with generated output checked into the repo.

When creating or editing blog content, use the source files under `content/`, not the generated site output:

- Chinese posts: `content/zh/posts/*.md`
- Chinese notes: `content/zh/notes/*.md`
- English posts: `content/en/posts/*.md`
- English notes: `content/en/notes/*.md`
- Article assets: `content/<lang>/assets/<posts|notes>/<slug>/`

Do not create new source articles under these generated output directories:

- `zh/posts/...`
- `zh/notes/...`
- `en/posts/...`
- `en/notes/...`
- `dist/...`

Those paths are build outputs generated from `content/`.

## Creating New Articles

Prefer the repository helper when creating a new article skeleton:

```bash
npm run new -- --lang zh --type post --title "文章标题" --slug 20260827-topic --tags Life --description "摘要"
```

If writing the file manually, create exactly one Markdown file at:

```text
content/<lang>/<posts|notes>/<slug>.md
```

Use YAML frontmatter matching existing source articles:

```yaml
---
title: 文章标题
date: '2026-08-27T00:00:00.000Z'
lang: zh
type: post
slug: 20260827-topic
description: 摘要
tags:
  - Life
---
```

The public URL will be generated as:

```text
/<lang>/<posts|notes>/<slug>/
```

## Verification

After adding or editing content, run:

```bash
npm run check
npm run build
```

`npm run build` regenerates the public output under `zh/`, `en/`, and `dist/`.
