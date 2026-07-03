import { siteConfig } from '../config.js';
import type { Post } from '../types.js';
import { absoluteUrl, escapeHtml } from '../utils/html.js';

const staticPaths = [
  '/',
  '/en/',
  '/zh/',
  '/en/posts/',
  '/zh/posts/',
  '/en/notes/',
  '/zh/notes/',
];

export function renderSitemap(posts: Post[], extraPaths: string[] = []): string {
  const urls = [...staticPaths, ...extraPaths, ...posts.map((post) => post.url)];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url>
    <loc>${escapeXml(absoluteUrl(siteConfig.siteUrl, url))}</loc>
  </url>`).join('\n')}
</urlset>
`;
}

function escapeXml(value: string): string {
  return escapeHtml(value);
}
