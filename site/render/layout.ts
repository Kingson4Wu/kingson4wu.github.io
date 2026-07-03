import { siteConfig } from '../config.js';
import type { Lang } from '../types.js';
import { absoluteUrl, escapeHtml } from '../utils/html.js';

interface RenderLayoutOptions {
  lang: Lang;
  title: string;
  description: string;
  canonicalPath: string;
  markdownPath?: string;
  body: string;
}

export function renderLayout({ lang, title, description, canonicalPath, markdownPath, body }: RenderLayoutOptions): string {
  const language = siteConfig.languages[lang];
  const fullTitle = title === language.title ? title : `${title} | ${language.title}`;
  const canonical = absoluteUrl(siteConfig.siteUrl, canonicalPath);
  const themeLabel = lang === 'zh' ? '切换明暗模式' : 'Switch color mode';
  const feedLabel = lang === 'zh' ? '订阅更新' : 'Subscribe';
  const returnLabel = lang === 'zh' ? '回到开头' : 'Back to start';
  const markdownAlternate = markdownPath
    ? `  <link rel="alternate" type="text/markdown" href="${escapeHtml(markdownPath)}">\n`
    : '';

  return `<!doctype html>
<html lang="${escapeHtml(lang)}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(fullTitle)}</title>
  <meta name="description" content="${escapeHtml(description)}">
  <link rel="canonical" href="${escapeHtml(canonical)}">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="alternate" type="application/rss+xml" title="${escapeHtml(language.title)}" href="/${escapeHtml(lang)}/feed.xml">
${markdownAlternate}  <link rel="stylesheet" href="/vendor/katex/katex.min.css">
  <link rel="stylesheet" href="/vendor/lxgw-wenkai-screen-webfont/lxgwwenkaigbscreen.css">
  <link rel="stylesheet" href="/styles/main.css">
  <script>
    try {
      var theme = localStorage.getItem('theme');
      if (theme) document.documentElement.dataset.theme = theme;
    } catch (_) {}
  </script>
</head>
<body>
  <header class="site-header">
    <a class="site-title" href="/${escapeHtml(lang)}/" aria-label="${escapeHtml(language.title)}">
      <span class="site-logo" aria-hidden="true">K</span>
      <span>${escapeHtml(language.title)}</span>
    </a>
    <nav class="site-nav" aria-label="Primary">
      ${language.nav.map(([label, href]) => `<a href="${escapeHtml(href)}">${escapeHtml(label)}</a>`).join('\n      ')}
      <a href="${escapeHtml(language.switchHref)}" lang="${escapeHtml(lang === 'en' ? 'zh' : 'en')}">${escapeHtml(language.switchLabel)}</a>
      <a class="feed-link" href="/${escapeHtml(lang)}/feed.xml" aria-label="${escapeHtml(feedLabel)}" title="${escapeHtml(feedLabel)}">
        <svg class="feed-icon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M5 5.5A13.5 13.5 0 0 1 18.5 19"></path>
          <path d="M5 11A8 8 0 0 1 13 19"></path>
          <circle cx="6" cy="18" r="1.5"></circle>
        </svg>
      </a>
      <button id="theme-toggle" class="theme-toggle" type="button" aria-label="${escapeHtml(themeLabel)}" title="${escapeHtml(themeLabel)}">
        <svg class="theme-icon theme-icon-moon" aria-hidden="true" viewBox="0 0 24 24">
          <path d="M21 14.2A8.5 8.5 0 0 1 9.8 3 7 7 0 1 0 21 14.2Z"></path>
        </svg>
        <svg class="theme-icon theme-icon-sun" aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4"></circle>
          <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M6.3 17.7l-1.4 1.4M19.1 4.9l-1.4 1.4"></path>
        </svg>
      </button>
    </nav>
  </header>
  <main class="site-main">
${body}
  </main>
  <footer class="site-footer">
    <p>&copy; ${new Date().getUTCFullYear()} ${escapeHtml(language.title)}</p>
  </footer>
  <button class="reading-return" type="button" data-reading-return aria-label="${escapeHtml(returnLabel)}" title="${escapeHtml(returnLabel)}">
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M12 19V5"></path>
      <path d="m6 11 6-6 6 6"></path>
    </svg>
  </button>
  <script src="/scripts/theme.js"></script>
  <script src="/scripts/image-viewer.js"></script>
  <script src="/scripts/reading-tools.js"></script>
</body>
</html>`;
}
