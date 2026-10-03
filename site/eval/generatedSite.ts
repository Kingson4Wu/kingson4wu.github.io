import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import { siteConfig } from '../config.js';

export interface GeneratedSiteFinding {
  file: string;
  line: number;
  href: string;
  rule: 'missing-generated-target' | 'missing-generated-fragment';
}

export interface GeneratedSiteReport {
  pages: number;
  links: number;
  errors: GeneratedSiteFinding[];
}

const referencePattern = /<(?:a|link|script|img|source)\b[^>]*?\s(?:href|src)=["']([^"']+)["'][^>]*>/gi;
const idPattern = /\sid=["']([^"']+)["']/gi;

export async function auditGeneratedSite(distDir: string): Promise<GeneratedSiteReport> {
  const pages = (await fg('**/*.html', { cwd: distDir })).sort();
  const errors: GeneratedSiteFinding[] = [];
  const exists = new Map<string, boolean>();
  const headings = new Map<string, Set<string>>();
  let links = 0;

  async function targetExists(file: string): Promise<boolean> {
    if (!exists.has(file)) {
      exists.set(file, await fs.stat(file).then((stat) => stat.isFile(), () => false));
    }
    return exists.get(file) === true;
  }

  async function targetIds(file: string): Promise<Set<string>> {
    let ids = headings.get(file);
    if (ids == null) {
      const html = await fs.readFile(file, 'utf8');
      ids = new Set([...html.matchAll(idPattern)].map((match) => match[1]));
      headings.set(file, ids);
    }
    return ids;
  }

  for (const page of pages) {
    const file = path.join(distDir, page);
    const html = await fs.readFile(file, 'utf8');
    const pageUrl = new URL(`/${page.replace(/index\.html$/, '')}`, siteConfig.siteUrl);
    for (const match of html.matchAll(referencePattern)) {
      const href = match[1].replace(/&amp;/g, '&');
      let target: URL;
      try {
        target = new URL(href, pageUrl);
      } catch {
        continue;
      }
      if (target.origin !== pageUrl.origin) continue;
      links += 1;
      const line = html.slice(0, match.index).split('\n').length;
      const relative = target.pathname.endsWith('/') ? `${target.pathname.slice(1)}index.html` : target.pathname.slice(1);
      const targetFile = path.resolve(distDir, safeDecode(relative));
      if (!targetFile.startsWith(`${path.resolve(distDir)}${path.sep}`)) {
        errors.push({ file, line, href, rule: 'missing-generated-target' });
        continue;
      }
      if (!await targetExists(targetFile)) {
        errors.push({ file, line, href, rule: 'missing-generated-target' });
        continue;
      }
      if (target.hash && targetFile.endsWith('.html')) {
        const fragment = safeDecode(target.hash.slice(1));
        if (fragment && !(await targetIds(targetFile)).has(fragment)) {
          errors.push({ file, line, href, rule: 'missing-generated-fragment' });
        }
      }
    }
  }

  return { pages: pages.length, links, errors };
}

function safeDecode(value: string): string {
  try { return decodeURIComponent(value); } catch { return value; }
}
