import { siteConfig } from '../config.js';
import type { Lang, Post } from '../types.js';
import { absoluteUrl, escapeHtml } from '../utils/html.js';

const maxItems = 30;

export function renderRss(lang: Lang, posts: Post[]): string {
  const language = siteConfig.languages[lang];
  const feedPosts = posts
    .filter((post) => post.lang === lang)
    .slice(0, maxItems);
  const latestDate = feedPosts[0]?.date ?? new Date(0);

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${escapeXml(language.title)}</title>
    <link>${escapeXml(absoluteUrl(siteConfig.siteUrl, `/${lang}/`))}</link>
    <description>${escapeXml(language.description)}</description>
    <language>${escapeXml(lang)}</language>
    <lastBuildDate>${escapeXml(latestDate.toUTCString())}</lastBuildDate>
${feedPosts.map(renderItem).join('\n')}
  </channel>
</rss>
`;
}

function renderItem(post: Post): string {
  const url = absoluteUrl(siteConfig.siteUrl, post.url);
  const description = post.description ?? post.excerpt;

  return `    <item>
      <title>${escapeXml(post.title)}</title>
      <link>${escapeXml(url)}</link>
      <guid>${escapeXml(url)}</guid>
      <pubDate>${escapeXml(post.date.toUTCString())}</pubDate>
      <description>${escapeXml(description)}</description>
    </item>`;
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}
