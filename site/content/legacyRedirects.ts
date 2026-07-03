import path from 'node:path';
import fse from 'fs-extra';
import type { Post, Redirect } from '../types.js';

interface RawRedirect {
  from?: unknown;
  to?: unknown;
}

export async function loadLegacyRedirects(filePath: string, posts: Post[]): Promise<Redirect[]> {
  if (!(await fse.pathExists(filePath))) {
    return [];
  }

  const raw = await fse.readJson(filePath) as unknown;
  if (!Array.isArray(raw)) {
    throw new Error(`Legacy redirects file must contain an array: ${filePath}`);
  }

  const postUrls = new Set(posts.map((post) => post.url));
  const seen = new Set<string>();

  return raw.map((entry) => {
    if (entry == null || typeof entry !== 'object') {
      throw new Error('Legacy redirect entries must be objects');
    }

    const redirect = normalizeRedirect(entry as RawRedirect, postUrls);
    if (seen.has(redirect.from)) {
      throw new Error(`Duplicate legacy redirect: ${redirect.from}`);
    }
    seen.add(redirect.from);
    return redirect;
  });
}

export function redirectOutputPath(from: string): string {
  const normalized = path.posix.normalize(from);
  if (!path.posix.isAbsolute(normalized) || normalized.split('/').includes('..')) {
    throw new Error(`Invalid redirect path: ${from}`);
  }

  const relativePath = normalized.replace(/^\/+/, '');
  return path.join(relativePath, 'index.html');
}

function normalizeRedirect(entry: RawRedirect, postUrls: Set<string>): Redirect {
  if (typeof entry.from !== 'string' || typeof entry.to !== 'string') {
    throw new Error('Legacy redirect entries must include string "from" and "to" fields');
  }

  const from = ensureTrailingSlash(entry.from);
  const to = ensureTrailingSlash(entry.to);

  redirectOutputPath(from);

  if (!postUrls.has(to)) {
    throw new Error(`Legacy redirect target does not exist: ${to}`);
  }

  return { from, to };
}

function ensureTrailingSlash(value: string): string {
  const trimmed = value.trim();
  if (!trimmed.startsWith('/')) {
    throw new Error(`Redirect path must be absolute: ${value}`);
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
}
