import path from 'node:path';
import type { Post } from '../types.js';

export function browserRoutes(posts: Post[], changedFiles: string[] = []): string[] {
  const routes = new Set(['/zh/', '/en/', '/zh/search/', '/en/search/']);
  const byPath = new Map(posts.map((post) => [path.resolve(post.inputPath), post]));
  for (const lang of ['zh', 'en'] as const) {
    const spacedTag = posts.flatMap((post) => post.lang === lang ? post.tags : []).find((tag) => tag.includes(' '));
    if (spacedTag) routes.add(`/${lang}/tags/${encodeURIComponent(spacedTag)}/`);
    for (const type of ['post', 'note'] as const) {
      const newest = posts.filter((post) => post.lang === lang && post.type === type)
        .sort((a, b) => b.date.valueOf() - a.date.valueOf())[0];
      if (newest) routes.add(newest.url);
    }
  }
  for (const file of changedFiles) {
    const post = byPath.get(path.resolve(file));
    if (!post) throw new Error(`Requested browser-check article was not loaded: ${file}`);
    routes.add(post.url);
  }
  return [...routes];
}
