import { siteConfig } from '../config.js';
import type { Lang, Post } from '../types.js';
import { absoluteUrl, escapeHtml, stripHtml } from '../utils/html.js';
import { renderLayout } from './layout.js';

interface RenderHomePageOptions {
  lang: Lang;
  posts: Post[];
  canonicalPath: string;
}

interface RenderListPageOptions {
  lang: Lang;
  title: string;
  type: 'post' | 'note';
  posts: Post[];
  canonicalPath: string;
}

interface RenderArticlePageOptions {
  post: Post;
  previous?: Post;
  next?: Post;
}

interface RenderAboutPageOptions {
  lang: Lang;
  html: string;
}

interface RenderTagIndexPageOptions {
  lang: Lang;
  tags: TagSummary[];
}

interface RenderTagPageOptions {
  lang: Lang;
  tag: string;
  posts: Post[];
}

interface RenderSearchPageOptions {
  lang: Lang;
}

interface TagSummary {
  name: string;
  count: number;
}

interface TocItem {
  id: string;
  level: 2 | 3;
  title: string;
}

function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(lang === 'zh' ? 'zh-CN' : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  }).format(date);
}

function renderPostList(posts: Post[]): string {
  if (posts.length === 0) {
    return '<p class="muted">No posts yet.</p>';
  }

  return `<ol class="post-list">
${posts.map((post) => `    <li>
      <div class="post-meta">
        <time datetime="${escapeHtml(post.date.toISOString())}">${escapeHtml(formatDate(post.date, post.lang))}</time>
        ${post.tags[0] ? `<span>${escapeHtml(post.tags[0])}</span>` : ''}
      </div>
      <div class="post-summary">
        <h2><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h2>
        <p>${escapeHtml(post.excerpt)}</p>
      </div>
    </li>`).join('\n')}
  </ol>`;
}

function renderNoteFeed(posts: Post[], lang: Lang): string {
  if (posts.length === 0) {
    return `<p class="muted">${escapeHtml(lang === 'zh' ? '还没有笔记。' : 'No notes yet.')}</p>`;
  }

  const permalinkLabel = lang === 'zh' ? '打开笔记' : 'Open note';

  return `<div class="note-feed">
${posts.map((post) => `    <article class="note-item">
      <header class="note-header">
        <h2><a href="${escapeHtml(post.url)}">${escapeHtml(post.title)}</a></h2>
        <time datetime="${escapeHtml(post.date.toISOString())}">${escapeHtml(formatDate(post.date, post.lang))}</time>
      </header>
      <div class="prose">
${post.html}
      </div>
      <a class="note-permalink" href="${escapeHtml(post.url)}">${escapeHtml(permalinkLabel)}</a>
    </article>`).join('\n')}
  </div>`;
}

function renderTags(tags: string[], lang: Lang): string {
  if (tags.length === 0) {
    return '';
  }

  return `<ul class="tag-list" aria-label="Tags">
${tags.map((tag) => `    <li><a href="/${escapeHtml(lang)}/tags/${escapeHtml(encodeURIComponent(tag))}/">${escapeHtml(tag)}</a></li>`).join('\n')}
  </ul>`;
}

function renderAdjacentLink(label: string, post: Post | undefined): string {
  if (!post) {
    return '';
  }

  return `<a href="${escapeHtml(post.url)}"><span>${escapeHtml(label)}</span>${escapeHtml(post.title)}</a>`;
}

function renderShareActions(post: Post): string {
  const url = absoluteUrl(siteConfig.siteUrl, post.url);
  const shareUrl = new URL('https://twitter.com/intent/tweet');
  shareUrl.searchParams.set('text', post.title);
  shareUrl.searchParams.set('url', url);

  return `<div class="article-actions" aria-label="Article actions">
      <a class="share-link" href="${escapeHtml(shareUrl.href)}" target="_blank" rel="noopener noreferrer" aria-label="Share on X">
        <span aria-hidden="true">X</span>
        <span>Share</span>
      </a>
    </div>`;
}

function renderComments(post: Post): string {
  const title = post.lang === 'zh' ? '评论' : 'Comments';

  return `<section class="comments" aria-labelledby="comments-heading">
      <h2 id="comments-heading">${escapeHtml(title)}</h2>
      <div
        data-comments
        data-comments-repo="Kingson4Wu/kingson4wu.github.io"
        data-comments-issue-term="pathname"
        data-comments-label="comment"
      ></div>
    </section>
    <script src="/scripts/comments.js" defer></script>`;
}

function extractTableOfContents(html: string): TocItem[] {
  const items: TocItem[] = [];
  const headingPattern = /<h([23])\b([^>]*)>([\s\S]*?)<\/h\1>/gi;
  let match: RegExpExecArray | null;

  while ((match = headingPattern.exec(html)) != null) {
    const [, level, attributes, titleHtml] = match;
    const id = getHtmlAttribute(attributes, 'id');
    const title = (getHtmlAttribute(attributes, 'data-heading-text') ?? stripHtml(titleHtml)).trim();

    if (id == null || title.length === 0) {
      continue;
    }

    items.push({
      id,
      level: level === '3' ? 3 : 2,
      title,
    });
  }

  return items;
}

function getHtmlAttribute(attributes: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}="([^"]*)"`, 'i');
  const match = attributes.match(pattern);

  return match ? decodeHtmlAttribute(match[1]) : undefined;
}

function decodeHtmlAttribute(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function renderArticleToc(post: Post): string {
  if (post.type !== 'post') {
    return '';
  }

  const items = extractTableOfContents(post.html);
  if (items.length < 2) {
    return '';
  }

  const title = post.lang === 'zh' ? '目录' : 'Contents';
  const openLabel = post.lang === 'zh' ? '打开目录' : 'Open contents';
  const closeLabel = post.lang === 'zh' ? '收起目录' : 'Close contents';

  return `<aside class="article-toc" data-article-toc aria-label="${escapeHtml(title)}">
      <button class="article-toc-toggle" type="button" data-article-toc-toggle aria-expanded="false" aria-controls="article-toc-panel" aria-label="${escapeHtml(openLabel)}" data-open-label="${escapeHtml(openLabel)}" data-close-label="${escapeHtml(closeLabel)}">
        <svg aria-hidden="true" viewBox="0 0 24 24">
          <path d="M8 6h11"></path>
          <path d="M8 12h11"></path>
          <path d="M8 18h11"></path>
          <path d="M4 6h.01"></path>
          <path d="M4 12h.01"></path>
          <path d="M4 18h.01"></path>
        </svg>
      </button>
      <nav id="article-toc-panel" class="article-toc-panel" data-article-toc-panel aria-label="${escapeHtml(title)}">
        <div class="article-toc-heading">${escapeHtml(title)}</div>
        <ol class="article-toc-list">
${items.map((item) => `          <li class="article-toc-level-${item.level}"><a href="#${escapeHtml(item.id)}" data-article-toc-link>${escapeHtml(item.title)}</a></li>`).join('\n')}
        </ol>
      </nav>
    </aside>
    <script src="/scripts/article-toc.js" defer></script>`;
}

export function renderHomePage({ lang, posts, canonicalPath }: RenderHomePageOptions): string {
  const language = siteConfig.languages[lang];
  const heading = lang === 'zh' ? '最近更新' : 'Latest writing';
  const signature = lang === 'zh' ? '写清楚，才算想清楚。' : 'Write clearly. Think clearly.';
  const intro = lang === 'zh'
    ? '软件架构、AI 系统、工程经验与阅读笔记。'
    : 'Software architecture, AI systems, engineering notes, and reading.';
  const body = `    <section class="page-heading">
      <p class="eyebrow">${escapeHtml(language.title)}</p>
      <h1>${escapeHtml(signature)}</h1>
      <p>${escapeHtml(intro)}</p>
    </section>
    <section aria-labelledby="latest-posts">
      <h2 id="latest-posts" class="section-title">${escapeHtml(heading)}</h2>
${renderPostList(posts)}
    </section>`;

  return renderLayout({
    lang,
    title: language.title,
    description: language.description,
    canonicalPath,
    body,
  });
}

export function renderListPage({ lang, title, type, posts, canonicalPath }: RenderListPageOptions): string {
  const language = siteConfig.languages[lang];
  const listHtml = type === 'note' ? renderNoteFeed(posts, lang) : renderPostList(posts);
  const body = `    <section class="page-heading">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(language.description)}</p>
    </section>
${listHtml}`;

  return renderLayout({
    lang,
    title,
    description: language.description,
    canonicalPath,
    body,
  });
}

export function renderArticlePage({ post, previous, next }: RenderArticlePageOptions): string {
  const description = post.description ?? post.excerpt;
  const body = `    <article class="article">
      <header class="article-header">
        <h1>${escapeHtml(post.title)}</h1>
        <time datetime="${escapeHtml(post.date.toISOString())}">${escapeHtml(formatDate(post.date, post.lang))}</time>
${renderTags(post.tags, post.lang)}
      </header>
      <div class="prose">
${post.html}
      </div>
${renderShareActions(post)}
    </article>
${renderArticleToc(post)}
    <nav class="article-nav" aria-label="Adjacent posts">
      ${renderAdjacentLink('Previous', previous)}
      ${renderAdjacentLink('Next', next)}
    </nav>
${renderComments(post)}`;

  return renderLayout({
    lang: post.lang,
    title: post.title,
    description,
    canonicalPath: post.url,
    markdownPath: `${post.url}index.md`,
    body,
  });
}

export function renderSearchPage({ lang }: RenderSearchPageOptions): string {
  const title = lang === 'zh' ? '搜索' : 'Search';
  const description = lang === 'zh' ? '搜索中文文章和笔记。' : 'Search English posts and notes.';
  const queryLabel = lang === 'zh' ? '关键词' : 'Query';
  const placeholder = lang === 'zh' ? '搜索标题、正文或标签' : 'Search title, body, or tags';
  const clearLabel = lang === 'zh' ? '清空' : 'Clear';
  const body = `    <section class="page-heading">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(description)}</p>
    </section>
    <section class="search-panel" aria-labelledby="search-heading" data-search-lang="${escapeHtml(lang)}">
      <h2 id="search-heading">${escapeHtml(title)}</h2>
      <div class="search-controls">
        <label>
          <span>${escapeHtml(queryLabel)}</span>
          <span class="search-input-wrap">
            <input type="search" data-search-input autocomplete="off" placeholder="${escapeHtml(placeholder)}">
            <button type="button" data-search-clear aria-label="${escapeHtml(clearLabel)}">&times;</button>
          </span>
        </label>
      </div>
      <p class="search-status muted" data-search-status></p>
      <div data-search-results class="search-results" aria-live="polite"></div>
    </section>
    <script src="/scripts/search.js" defer></script>`;

  return renderLayout({
    lang,
    title,
    description,
    canonicalPath: `/${lang}/search/`,
    body,
  });
}

export function renderAboutPage({ lang, html }: RenderAboutPageOptions): string {
  const title = lang === 'zh' ? '关于' : 'About';
  const description = lang === 'zh'
    ? '关于 Kingson Wu 的技术写作。'
    : 'About Kingson Wu and this technical writing site.';
  const body = `    <article class="article">
      <header class="article-header">
        <h1>${escapeHtml(title)}</h1>
      </header>
      <div class="prose">
${html}
      </div>
    </article>`;

  return renderLayout({
    lang,
    title,
    description,
    canonicalPath: `/${lang}/about/`,
    body,
  });
}

export function renderTagIndexPage({ lang, tags }: RenderTagIndexPageOptions): string {
  const title = lang === 'zh' ? '标签' : 'Tags';
  const counts = tags.map((tag) => tag.count);
  const min = Math.min(...counts);
  const max = Math.max(...counts);
  const body = `    <section class="page-heading">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(lang === 'zh' ? '按标签浏览文章和笔记。' : 'Browse posts and notes by tag.')}</p>
    </section>
    ${tags.length === 0 ? '<p class="muted">No tags yet.</p>' : `<ul class="tag-cloud">
${tags.map((tag) => `      <li><a class="tag-size-${tagSize(tag.count, min, max)}" href="/${escapeHtml(lang)}/tags/${escapeHtml(encodeURIComponent(tag.name))}/">${escapeHtml(tag.name)} <span>${escapeHtml(String(tag.count))}</span></a></li>`).join('\n')}
    </ul>`}`;

  return renderLayout({
    lang,
    title,
    description: lang === 'zh' ? '按标签浏览文章和笔记。' : 'Browse posts and notes by tag.',
    canonicalPath: `/${lang}/tags/`,
    body,
  });
}

function tagSize(count: number, min: number, max: number): number {
  if (max === min) {
    return 3;
  }

  return Math.min(5, Math.max(1, Math.round(((count - min) / (max - min)) * 4) + 1));
}

export function renderTagPage({ lang, tag, posts }: RenderTagPageOptions): string {
  const title = `${lang === 'zh' ? '标签' : 'Tag'}: ${tag}`;
  const body = `    <section class="page-heading">
      <h1>${escapeHtml(title)}</h1>
      <p>${escapeHtml(lang === 'zh' ? '包含此标签的内容。' : 'Writing with this tag.')}</p>
    </section>
${renderPostList(posts)}`;

  return renderLayout({
    lang,
    title,
    description: lang === 'zh' ? '包含此标签的内容。' : 'Writing with this tag.',
    canonicalPath: `/${lang}/tags/${encodeURIComponent(tag)}/`,
    body,
  });
}

export function renderRedirectPage(to: string): string {
  const escapedTo = escapeHtml(to);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Redirecting</title>
  <meta http-equiv="refresh" content="0; url=${escapedTo}">
  <link rel="canonical" href="${escapedTo}">
</head>
<body>
  <p>Redirecting to <a href="${escapedTo}">${escapedTo}</a>.</p>
</body>
</html>`;
}
