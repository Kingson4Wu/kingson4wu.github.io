import { siteConfig } from '../config.js';
import type { ContentType, Lang, Post } from '../types.js';
import { absoluteUrl } from '../utils/html.js';

const contentThemes = [
  'AI systems and agent engineering',
  'software architecture and distributed systems',
  'programming languages, especially Rust, Go, Python, and Java',
  'engineering practice, career reflection, and reading notes',
];

export function renderRobotsTxt(): string {
  return [
    '# Search and retrieval crawlers are allowed so AI search can cite public content.',
    'User-agent: OAI-SearchBot',
    'Allow: /',
    '',
    'User-agent: Claude-SearchBot',
    'Allow: /',
    '',
    'User-agent: PerplexityBot',
    'Allow: /',
    '',
    '# User-triggered crawlers are allowed so pasted URLs can be summarized accurately.',
    'User-agent: ChatGPT-User',
    'Allow: /',
    '',
    'User-agent: Claude-User',
    'Allow: /',
    '',
    'User-agent: Perplexity-User',
    'Allow: /',
    '',
    'User-agent: Google-Agent',
    'Allow: /',
    '',
    '# Training crawlers and AI-training opt-out tokens are blocked.',
    'User-agent: GPTBot',
    'Disallow: /',
    '',
    'User-agent: ClaudeBot',
    'Disallow: /',
    '',
    'User-agent: CCBot',
    'Disallow: /',
    '',
    'User-agent: Meta-ExternalAgent',
    'Disallow: /',
    '',
    'User-agent: Google-Extended',
    'Disallow: /',
    '',
    'User-agent: Applebot-Extended',
    'Disallow: /',
    '',
    '# Undeclared or low-transparency crawlers are blocked.',
    'User-agent: Bytespider',
    'Disallow: /',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    `Sitemap: ${absoluteUrl(siteConfig.siteUrl, '/sitemap.xml')}`,
    '',
  ].join('\n');
}

export function renderLlmsTxt(posts: Post[]): string {
  const latest = sortedPosts(posts).slice(0, 12);

  return [
    '# Kingson Wu / 拉巴力的纸皮箱',
    '',
    '> Bilingual personal blog about software engineering, AI systems, architecture, programming, and learning.',
    '',
    '## Site',
    '',
    `- Canonical: ${siteConfig.siteUrl}`,
    `- English home: ${absoluteUrl(siteConfig.siteUrl, '/en/')}`,
    `- Chinese home: ${absoluteUrl(siteConfig.siteUrl, '/zh/')}`,
    `- Sitemap: ${absoluteUrl(siteConfig.siteUrl, '/sitemap.xml')}`,
    `- Full AI context: ${absoluteUrl(siteConfig.siteUrl, '/llms-full.txt')}`,
    `- Structured profile JSON: ${absoluteUrl(siteConfig.siteUrl, '/ai-profile.json')}`,
    '',
    '## Content Themes',
    '',
    ...contentThemes.map((theme) => `- ${theme}`),
    '',
    '## Feeds',
    '',
    `- English RSS: ${absoluteUrl(siteConfig.siteUrl, '/en/feed.xml')}`,
    `- Chinese RSS: ${absoluteUrl(siteConfig.siteUrl, '/zh/feed.xml')}`,
    '',
    '## Latest Public Writing',
    '',
    ...latest.map((post) => `- ${renderPostLink(post)} — ${post.excerpt}`),
    '',
    '## Markdown Routes',
    '',
    'Every article and note has an adjacent Markdown representation at `index.md`, linked from the HTML page with `rel="alternate" type="text/markdown"`.',
    '',
  ].join('\n');
}

export function renderLlmsFullTxt(posts: Post[]): string {
  const orderedPosts = sortedPosts(posts);
  const counts = contentCounts(posts);
  const tags = topTags(posts, 24);

  return [
    '# Kingson Wu / 拉巴力的纸皮箱 - Full AI Context',
    '',
    'This file gives AI search and retrieval systems a compact, accurate map of the public content on kingson4wu.github.io.',
    '',
    '## Identity',
    '',
    'Kingson Wu writes in English and Chinese about software engineering, AI systems, software architecture, programming languages, engineering practice, and learning.',
    'The Chinese site name is 拉巴力的纸皮箱. The root path redirects readers to the English home page, while `/zh/` is the Chinese entry point.',
    '',
    '## Canonical Entry Points',
    '',
    `- Home: ${siteConfig.siteUrl}`,
    `- English: ${absoluteUrl(siteConfig.siteUrl, '/en/')}`,
    `- Chinese: ${absoluteUrl(siteConfig.siteUrl, '/zh/')}`,
    `- English posts: ${absoluteUrl(siteConfig.siteUrl, '/en/posts/')}`,
    `- Chinese posts: ${absoluteUrl(siteConfig.siteUrl, '/zh/posts/')}`,
    `- English notes: ${absoluteUrl(siteConfig.siteUrl, '/en/notes/')}`,
    `- Chinese notes: ${absoluteUrl(siteConfig.siteUrl, '/zh/notes/')}`,
    `- Tags: ${absoluteUrl(siteConfig.siteUrl, '/zh/tags/')}`,
    `- Search: ${absoluteUrl(siteConfig.siteUrl, '/en/search/')}`,
    `- Sitemap: ${absoluteUrl(siteConfig.siteUrl, '/sitemap.xml')}`,
    '',
    '## Content Profile',
    '',
    `- Total public content items: ${counts.total}`,
    `- English posts: ${counts.en.post}`,
    `- English notes: ${counts.en.note}`,
    `- Chinese posts: ${counts.zh.post}`,
    `- Chinese notes: ${counts.zh.note}`,
    '',
    '## Main Topics',
    '',
    ...contentThemes.map((theme) => `- ${theme}`),
    '',
    '## Tag Cloud',
    '',
    ...tags.map((tag) => `- ${tag.name}: ${tag.count}`),
    '',
    '## Retrieval Notes',
    '',
    '- Prefer canonical HTML URLs when citing pages for human readers.',
    '- Prefer adjacent `index.md` URLs when an AI tool needs lower-noise Markdown content.',
    '- RSS feeds are available per language. The root feed mirrors English writing.',
    '- Notes are short-form writing. Posts are longer articles.',
    '',
    '## Recent Highlights',
    '',
    ...orderedPosts.slice(0, 20).map((post) => `- ${formatDate(post.date)} | ${post.lang} | ${post.type} | ${post.title} | ${post.excerpt}`),
    '',
    '## Content Index',
    '',
    ...orderedPosts.flatMap(renderContentIndexItem),
    '',
  ].join('\n');
}

export function renderAiProfileJson(posts: Post[]): string {
  const orderedPosts = sortedPosts(posts);
  const counts = contentCounts(posts);
  const profile = {
    site: {
      name: 'Kingson Wu / 拉巴力的纸皮箱',
      url: siteConfig.siteUrl,
      description: 'Bilingual personal blog about software engineering, AI systems, architecture, programming, and learning.',
      languages: {
        en: siteConfig.languages.en,
        zh: siteConfig.languages.zh,
      },
      sitemap: absoluteUrl(siteConfig.siteUrl, '/sitemap.xml'),
      llms: absoluteUrl(siteConfig.siteUrl, '/llms.txt'),
      llmsFull: absoluteUrl(siteConfig.siteUrl, '/llms-full.txt'),
      feeds: {
        root: absoluteUrl(siteConfig.siteUrl, '/feed.xml'),
        en: absoluteUrl(siteConfig.siteUrl, '/en/feed.xml'),
        zh: absoluteUrl(siteConfig.siteUrl, '/zh/feed.xml'),
      },
    },
    content: {
      counts,
      themes: contentThemes,
      topTags: topTags(posts, 20),
      latest: orderedPosts.slice(0, 30).map(postSummary),
    },
  };

  return `${JSON.stringify(profile, null, 2)}\n`;
}

export function renderMarkdownContentRoute(post: Post): string {
  return [
    `# ${post.title}`,
    '',
    `Canonical: ${absoluteUrl(siteConfig.siteUrl, post.url)}`,
    `Markdown: ${markdownUrl(post)}`,
    `Language: ${post.lang}`,
    `Type: ${post.type}`,
    `Date: ${formatDate(post.date)}`,
    `Tags: ${post.tags.join(', ') || 'none'}`,
    '',
    post.excerpt,
    '',
    '---',
    '',
    post.body.trim(),
    '',
  ].join('\n');
}

function renderPostLink(post: Post): string {
  return `[${post.title}](${absoluteUrl(siteConfig.siteUrl, post.url)})`;
}

function sortedPosts(posts: Post[]): Post[] {
  return [...posts].sort((a, b) => b.date.valueOf() - a.date.valueOf() || a.title.localeCompare(b.title));
}

function renderContentIndexItem(post: Post): string[] {
  return [
    `- ${formatDate(post.date)} | ${post.lang} | ${post.type} | ${post.title} | Tags: ${post.tags.join(', ') || 'none'} | HTML: ${absoluteUrl(siteConfig.siteUrl, post.url)} | Markdown: ${markdownUrl(post)}`,
  ];
}

function postSummary(post: Post) {
  return {
    title: post.title,
    lang: post.lang,
    type: post.type,
    date: formatDate(post.date),
    tags: post.tags,
    url: absoluteUrl(siteConfig.siteUrl, post.url),
    markdownUrl: markdownUrl(post),
    excerpt: post.excerpt,
  };
}

function markdownUrl(post: Post): string {
  return absoluteUrl(siteConfig.siteUrl, `${post.url}index.md`);
}

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function contentCounts(posts: Post[]): { total: number; en: Record<ContentType, number>; zh: Record<ContentType, number> } {
  return {
    total: posts.length,
    en: countByType(posts, 'en'),
    zh: countByType(posts, 'zh'),
  };
}

function countByType(posts: Post[], lang: Lang): Record<ContentType, number> {
  return {
    post: posts.filter((post) => post.lang === lang && post.type === 'post').length,
    note: posts.filter((post) => post.lang === lang && post.type === 'note').length,
  };
}

function topTags(posts: Post[], limit: number): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const post of posts) {
    for (const tag of post.tags) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
    .slice(0, limit);
}
