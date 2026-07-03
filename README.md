# Kingson Wu Blog

Unified bilingual static blog for `https://kingson4wu.github.io/`.

## Structure

- `content/`: Markdown posts, notes, about pages, legacy redirects, and article assets.
- `site/`: custom TypeScript static generator, renderers, migration scripts, styles, and browser scripts.
- `dist/`: generated GitHub Pages output.

## Commands

```bash
npm install
npm run migrate
npm run new -- --lang zh --type post --title "文章标题"
npm run check
npm run build
npm run dev
```

## URLs

- `/` and `/en/`: English homepage.
- `/zh/`: Chinese homepage.
- `/en/search/`: English search.
- `/zh/search/`: Chinese search.
- `/search/`: redirects to English search for compatibility.
- `/en/rss.xml` and `/zh/rss.xml`: RSS feeds.
