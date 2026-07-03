# Blog Maintenance

## Add Content

- English posts: `content/en/posts/`
- English notes: `content/en/notes/`
- Chinese posts: `content/zh/posts/`
- Chinese notes: `content/zh/notes/`
- Article assets: `content/en/assets/` and `content/zh/assets/`

Use the scaffold command for new writing:

```bash
npm run new -- --lang zh --type post --title "文章标题" --slug 20260703-topic --tags AI,Agent
```

Options:

- `--lang`: `zh` or `en`
- `--type`: `post` or `note`
- `--title`: required article title
- `--slug`: optional URL slug; defaults to `YYYYMMDD-title-slug`
- `--tags`: optional comma-separated tags
- `--description`: optional summary
- `--date`: optional ISO date; defaults to current time
- `--assets`: create the matching asset directory and print the asset URL prefix

The public article URL is derived from the Markdown filename, not the frontmatter `slug` field. Do not rename a published Markdown file unless you also add a legacy redirect.

## Validate

```bash
npm test
npm run check
npm run build
```

## Preview

```bash
npm run dev
```

Open `http://localhost:4321/`.

## Deploy

Push `main`. GitHub Actions checks content, builds `dist/`, and deploys it to GitHub Pages.

## Legacy Redirects

Old Chinese Hexo URLs are stored in `content/legacy-redirects.json` and generated as static redirect pages.

When migrating or renaming old content, keep each `from` path pointing at the old public URL and each `to` path pointing at the new `/zh/posts/` or `/zh/notes/` URL.

## Comments

Article comments use `utterances` with GitHub Issues in `Kingson4Wu/kingson4wu.github.io`. If comments do not load, install the utterances GitHub App for this repository and keep Issues enabled.

## Legacy Repositories

Archive or delete the old `Kingson4Wu/en` and `Kingson4Wu/zh` repositories only after these public URLs have been verified:

- `https://kingson4wu.github.io/`
- `https://kingson4wu.github.io/en/`
- `https://kingson4wu.github.io/zh/`
- `https://kingson4wu.github.io/en/search/`
- `https://kingson4wu.github.io/zh/search/`
- `https://kingson4wu.github.io/en/rss.xml`
- `https://kingson4wu.github.io/zh/rss.xml`
- Representative old Chinese URLs such as `/zh/2026/03/31/20260331-cong-skill-hua-dao-kong-zhi-quan-ai-xi-tong-zhong-de-neng-li-fen-ceng-yu-zi-chan-bao-hu/`
