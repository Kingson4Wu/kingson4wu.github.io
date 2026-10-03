import { describe, expect, it } from 'vitest';
import type { Post } from '../site/types.js';
import { browserRoutes } from '../site/eval/browserRoutes.js';

const post = (inputPath: string, url: string, lang: 'zh' | 'en', type: 'post' | 'note', date: string): Post => ({
  inputPath, url, lang, type, date: new Date(date), tags: [], title: url, slug: url,
  body: '', html: '', excerpt: '', outputPath: '',
});

it('includes modified older articles by their public route, not their filename', () => {
  const posts = [
    post('/repo/content/zh/posts/new.md', '/zh/posts/new/', 'zh', 'post', '2026-10-02'),
    post('/repo/content/zh/posts/old-source.md', '/zh/posts/legacy-slug/', 'zh', 'post', '2020-01-01'),
    post('/repo/content/en/posts/new.md', '/en/posts/new/', 'en', 'post', '2026-10-01'),
  ];

  const routes = browserRoutes(posts, ['/repo/content/zh/posts/old-source.md']);

  expect(routes).toContain('/zh/posts/legacy-slug/');
  expect(routes.filter((route) => route === '/zh/posts/legacy-slug/')).toHaveLength(1);
});

it('rejects a requested article that was not loaded', () => {
  expect(() => browserRoutes([], ['/repo/content/zh/posts/missing.md'])).toThrow('not loaded');
});
