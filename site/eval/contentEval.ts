import fs from 'node:fs/promises';
import path from 'node:path';
import matter from 'gray-matter';
import type { Post } from '../types.js';

export interface ChangedArticle {
  path: string;
  isNew: boolean;
}

export interface Diagnostic {
  file: string;
  line: number;
  rule: string;
  severity: 'error' | 'warning';
  message: string;
}

const linkPattern = /<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi;
const headingIdPattern = /<h[1-6]\b[^>]*\bid=["']([^"']+)["'][^>]*>/gi;

export async function evaluateContent(posts: Post[], changed: ChangedArticle[]): Promise<Diagnostic[]> {
  const routes = new Map(posts.map((post) => [post.url, post]));
  const byPath = new Map(posts.map((post) => [path.resolve(post.inputPath), post]));
  const diagnostics: Diagnostic[] = [];

  for (const change of changed) {
    const post = byPath.get(path.resolve(change.path));
    if (post == null) continue;
    const source = await fs.readFile(post.inputPath, 'utf8');
    diagnostics.push(...checkFrontmatter(post, source, change.isNew));
    diagnostics.push(...checkInternalLinks(post, routes, source));
  }

  return diagnostics.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.rule.localeCompare(b.rule));
}

function checkFrontmatter(post: Post, source: string, isNew: boolean): Diagnostic[] {
  const fields = matter(source).data;
  const expectedSlug = path.basename(post.inputPath, '.md');
  const checks: Array<[string, unknown, unknown, string]> = [
    ['lang', fields.lang, post.lang, 'Language must match the source directory'],
    ['type', fields.type, post.type, 'Type must match the source directory'],
  ];
  if (isNew) checks.push(['slug', fields.slug, expectedSlug, 'Slug must match the source filename']);
  const diagnostics: Diagnostic[] = [];
  for (const [name, actual, expected, message] of checks) {
    if (actual !== expected) diagnostics.push(diagnostic(post, source, `frontmatter-${name}`, 'error', message, `${name}:`));
  }
  if (isNew && (typeof fields.description !== 'string' || !fields.description.trim())) {
    diagnostics.push(diagnostic(post, source, 'frontmatter-description', 'error', 'New articles need a non-empty description', 'description:'));
  }
  return diagnostics;
}

function checkInternalLinks(post: Post, routes: Map<string, Post>, source: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  for (const match of post.html.matchAll(linkPattern)) {
    const href = match[1].replace(/&amp;/g, '&');
    let target: URL;
    try {
      target = new URL(href, `https://blog.local${post.url}`);
    } catch {
      continue;
    }
    if (target.hostname !== 'blog.local' && target.hostname !== 'kingson4wu.github.io') continue;
    if (/^\/(?:\d{4}\/\d{2}\/\d{2}|en\/blog)\//.test(target.pathname)) {
      diagnostics.push({ file: post.inputPath, line: sourceLine(source, href), rule: 'legacy-article-link', severity: 'error', message: `Obsolete article URL; use its current /<lang>/<posts|notes>/<slug>/ route: ${href}` });
      continue;
    }
    if (!/^\/(?:zh|en)\/(?:posts|notes)\//.test(target.pathname)) continue;
    const route = target.pathname.endsWith('/') ? target.pathname : `${target.pathname}/`;
    const linkedPost = routes.get(route);
    const line = sourceLine(source, href);
    if (linkedPost == null) {
      diagnostics.push({ file: post.inputPath, line, rule: 'internal-link', severity: 'error', message: `Article route does not exist: ${href}` });
      continue;
    }
    if (!target.hash) continue;
    const fragment = safeDecode(target.hash.slice(1));
    const headingIds = new Set([...linkedPost.html.matchAll(headingIdPattern)].map((heading) => safeDecode(heading[1])));
    if (!headingIds.has(fragment)) {
      diagnostics.push({ file: post.inputPath, line, rule: 'internal-anchor', severity: 'error', message: `Article heading does not exist: ${href}` });
    }
  }
  return diagnostics;
}

function diagnostic(post: Post, source: string, rule: string, severity: Diagnostic['severity'], message: string, needle: string): Diagnostic {
  return { file: post.inputPath, line: sourceLine(source, needle), rule, severity, message };
}

function sourceLine(source: string, needle: string): number {
  const lines = source.split('\n');
  const decoded = safeDecode(needle);
  const index = lines.findIndex((line) => line.includes(needle) || line.includes(decoded));
  return index < 0 ? 1 : index + 1;
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
