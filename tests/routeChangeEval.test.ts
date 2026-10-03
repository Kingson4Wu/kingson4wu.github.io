import { describe, expect, it } from 'vitest';
import type { Post } from '../site/types.js';
import { evaluateRouteChange } from '../site/eval/routeChanges.js';

const file = '/content/zh/posts/article.md';
const source = "---\nslug: changed\n---\n\nBody";
const post = { inputPath: file, lang: 'zh', type: 'post', slug: 'changed', url: '/zh/posts/changed/' } as Post;

describe('evaluateRouteChange', () => {
  it('blocks an existing public URL change without a redirect', () => {
    expect(evaluateRouteChange(post, 'original', [], source)).toEqual([
      expect.objectContaining({ rule: 'article-route-changed', severity: 'error', line: 2 }),
    ]);
  });

  it('accepts an unchanged legacy slug or a redirect to the new URL', () => {
    expect(evaluateRouteChange(post, 'changed', [], source)).toEqual([]);
    expect(evaluateRouteChange(post, 'original', [{ from: '/zh/posts/original/', to: post.url }], source)).toEqual([]);
  });
});
