import type { Post } from '../types.js';

interface SearchIndexItem {
  title: string;
  lang: Post['lang'];
  type: Post['type'];
  url: string;
  date: string;
  tags: string[];
  excerpt: string;
  body: string;
}

const maxBodyLength = 5000;

export function renderSearchIndex(posts: Post[]): string {
  const items: SearchIndexItem[] = posts.map((post) => ({
    title: post.title,
    lang: post.lang,
    type: post.type,
    url: post.url,
    date: post.date.toISOString(),
    tags: post.tags,
    excerpt: post.excerpt,
    body: compactBody(post.body).slice(0, maxBodyLength),
  }));

  return `${JSON.stringify(items, null, 2)}\n`;
}

function compactBody(body: string): string {
  return body.replace(/\s+/g, ' ').trim();
}
