import type { Post, Redirect } from '../types.js';
import type { Diagnostic } from './contentEval.js';

export function evaluateRouteChange(post: Post, previousSlug: string, redirects: Redirect[], source: string): Diagnostic[] {
  const previousUrl = `/${post.lang}/${post.type === 'post' ? 'posts' : 'notes'}/${previousSlug}/`;
  if (previousUrl === post.url || redirects.some((redirect) => redirect.from === previousUrl && redirect.to === post.url)) return [];
  const line = source.split('\n').findIndex((text) => /^slug\s*:/.test(text)) + 1;
  return [{
    file: post.inputPath,
    line: Math.max(line, 1),
    rule: 'article-route-changed',
    severity: 'error',
    message: `Article URL changed from ${previousUrl} to ${post.url}; preserve the old slug or add a redirect`,
  }];
}
