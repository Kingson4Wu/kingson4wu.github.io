import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ReleaseManifest {
  commit: string;
  pages: Array<{ route: string; sha256: string }>;
}

export async function createReleaseManifest(distDir: string, commit: string, routes: string[]): Promise<ReleaseManifest> {
  if (!commit.trim()) throw new Error('A commit SHA is required for release verification');
  const pages = [];
  const root = path.resolve(distDir);
  for (const route of new Set(routes)) {
    if (!route.startsWith('/') || route.includes('?') || route.includes('#')) throw new Error(`Invalid release route: ${route}`);
    const relative = decodeURIComponent(route.slice(1)) + (route.endsWith('/') ? 'index.html' : '');
    const file = path.resolve(root, relative);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error(`Release route escapes dist: ${route}`);
    const bytes = await fs.readFile(file);
    pages.push({ route, sha256: createHash('sha256').update(bytes).digest('hex') });
  }
  return { commit, pages };
}
