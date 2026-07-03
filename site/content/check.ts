import fs from 'node:fs/promises';
import path from 'node:path';
import { siteConfig } from '../config.js';
import type { Lang } from '../types.js';
import type { LoadedContent } from './loadContent.js';

export interface CheckResult {
  errors: string[];
  warnings: string[];
}

const htmlAssetReferencePattern = /<img\b[^>]*\bsrc=["'](\/assets\/[^"']+)["'][^>]*>/gi;

export async function checkContent(content: LoadedContent, contentDir = siteConfig.contentDir): Promise<CheckResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const seen = new Set<string>();

  for (const post of content.posts) {
    const key = `${post.lang}/${post.type}/${post.slug}`;
    if (seen.has(key)) {
      errors.push(`Duplicate content item: ${key}`);
    }
    seen.add(key);

    if (post.title.trim().length === 0) {
      errors.push(`Missing title: ${post.inputPath}`);
    }

    if (Number.isNaN(post.date.valueOf())) {
      errors.push(`Invalid date: ${post.inputPath}`);
    }

    for (const assetUrl of findLocalAssetUrls(post.body)) {
      const assetPath = assetUrlToContentPath(assetUrl, contentDir);
      if (assetPath == null) {
        errors.push(`Unsupported asset URL for ${post.inputPath}: ${assetUrl}`);
        continue;
      }

      try {
        await fs.stat(assetPath);
      } catch {
        errors.push(`Missing asset for ${post.inputPath}: ${assetUrl} -> ${assetPath}`);
      }
    }
  }

  return { errors, warnings };
}

function findLocalAssetUrls(markdown: string): string[] {
  const urls = findMarkdownAssetUrls(markdown);

  for (const match of markdown.matchAll(htmlAssetReferencePattern)) {
    urls.push(match[1]);
  }

  return urls;
}

function findMarkdownAssetUrls(markdown: string): string[] {
  const urls: string[] = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const imageStart = markdown.indexOf('![', cursor);
    if (imageStart === -1) {
      break;
    }

    const destinationStart = findMarkdownImageDestinationStart(markdown, imageStart + 2);
    if (destinationStart == null) {
      cursor = imageStart + 2;
      continue;
    }

    const destinationEnd = findMarkdownImageDestinationEnd(markdown, destinationStart);
    if (destinationEnd == null) {
      cursor = destinationStart;
      continue;
    }

    const destination = extractMarkdownDestination(markdown.slice(destinationStart, destinationEnd));
    if (destination.startsWith('/assets/')) {
      urls.push(destination);
    }

    cursor = destinationEnd + 1;
  }

  return urls;
}

function findMarkdownImageDestinationStart(markdown: string, cursor: number): number | undefined {
  const altEnd = markdown.indexOf('](', cursor);
  if (altEnd === -1) {
    return undefined;
  }

  return altEnd + 2;
}

function findMarkdownImageDestinationEnd(markdown: string, start: number): number | undefined {
  let depth = 0;

  for (let index = start; index < markdown.length; index += 1) {
    const character = markdown[index];
    if (character === '\\') {
      index += 1;
      continue;
    }

    if (character === '(') {
      depth += 1;
      continue;
    }

    if (character === ')') {
      if (depth === 0) {
        return index;
      }
      depth -= 1;
    }
  }

  return undefined;
}

function extractMarkdownDestination(rawDestination: string): string {
  const trimmed = rawDestination.trim();
  if (trimmed.startsWith('<')) {
    const closingBracket = trimmed.indexOf('>');
    return closingBracket === -1 ? trimmed : trimmed.slice(1, closingBracket);
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === '\\') {
      index += 1;
      continue;
    }

    if (character === '(') {
      depth += 1;
      continue;
    }

    if (character === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }

    if (depth === 0 && /\s/.test(character)) {
      return trimmed.slice(0, index);
    }
  }

  return trimmed;
}

function assetUrlToContentPath(assetUrl: string, contentDir: string): string | undefined {
  const segments = assetUrl.split('/').filter(Boolean);
  const [assetsSegment, lang, ...rest] = segments;

  if (assetsSegment !== 'assets' || !isLang(lang) || rest.length === 0) {
    return undefined;
  }

  const decodedSegments = rest.map(decodePathSegment);
  if (decodedSegments.some(isUnsafeAssetSegment)) {
    return undefined;
  }

  const assetRoot = path.resolve(contentDir, lang, 'assets');
  const resolvedPath = path.resolve(assetRoot, ...decodedSegments);
  const relativePath = path.relative(assetRoot, resolvedPath);

  if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    return undefined;
  }

  return resolvedPath;
}

function isLang(value: string | undefined): value is Lang {
  return value === 'en' || value === 'zh';
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function isUnsafeAssetSegment(segment: string): boolean {
  return segment === '..' || segment.includes('/') || segment.includes('\\');
}
