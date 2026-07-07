import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageReference {
  kind: 'markdown' | 'html';
  url: string;
  alt: string;
  hasCaption: boolean;
}

export interface AuditPostImagesOptions {
  inputPath: string;
  body: string;
  contentDir: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const figurePattern = /<figure\b[\s\S]*?<\/figure>/gi;

export function findImageReferences(markdown: string): ImageReference[] {
  const references: ImageReference[] = [];

  for (const reference of findMarkdownImageReferences(markdown)) {
    references.push(reference);
  }

  const figureRanges = [...markdown.matchAll(figurePattern)].map((match) => {
    const start = match.index != null ? match.index : 0;
    return {
      start,
      end: start + match[0].length,
      html: match[0],
    };
  });

  for (const match of markdown.matchAll(htmlImagePattern)) {
    const index = match.index != null ? match.index : 0;
    const figure = figureRanges.find((range) => index >= range.start && index < range.end);
    references.push({
      kind: 'html',
      url: match[1],
      alt: getHtmlAttribute(match[0], 'alt') || '',
      hasCaption: figure != null && figure.html.toLowerCase().includes('<figcaption'),
    });
  }

  return references;
}

export async function auditPostImages(options: AuditPostImagesOptions): Promise<string[]> {
  const warnings: string[] = [];

  for (const reference of findImageReferences(options.body)) {
    if (!reference.url.startsWith('/assets/')) {
      continue;
    }

    if (reference.alt.trim().length === 0) {
      warnings.push(`Empty image alt text in ${options.inputPath}: ${reference.url}`);
    }

    if (!reference.hasCaption) {
      warnings.push(`Bare article image should use <figure> with <figcaption> in ${options.inputPath}: ${reference.url}`);
    }

    const assetPath = assetUrlToContentPath(reference.url, options.contentDir);
    if (assetPath == null) {
      continue;
    }

    const dimensions = await readImageDimensions(assetPath);
    if (dimensions != null && dimensions.height >= 3000 && dimensions.height / dimensions.width >= 3) {
      warnings.push(
        `Very tall image in ${options.inputPath}: ${reference.url} is ${dimensions.width}x${dimensions.height}`,
      );
    }
  }

  return warnings;
}

function findMarkdownImageReferences(markdown: string): ImageReference[] {
  const references: ImageReference[] = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const imageStart = markdown.indexOf('![', cursor);
    if (imageStart === -1) {
      break;
    }

    const altEnd = markdown.indexOf('](', imageStart + 2);
    if (altEnd === -1) {
      cursor = imageStart + 2;
      continue;
    }

    const destinationStart = altEnd + 2;
    const destinationEnd = findMarkdownDestinationEnd(markdown, destinationStart);
    if (destinationEnd == null) {
      cursor = destinationStart;
      continue;
    }

    references.push({
      kind: 'markdown',
      url: extractMarkdownDestination(markdown.slice(destinationStart, destinationEnd)),
      alt: markdown.slice(imageStart + 2, altEnd),
      hasCaption: false,
    });

    cursor = destinationEnd + 1;
  }

  return references;
}

function findMarkdownDestinationEnd(markdown: string, start: number): number | undefined {
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

function getHtmlAttribute(tag: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}=["']([^"']*)["']`, 'i');
  const match = tag.match(pattern);
  return match != null ? match[1] : undefined;
}

function assetUrlToContentPath(assetUrl: string, contentDir: string): string | undefined {
  const segments = assetUrl.split('/').filter(Boolean);
  const [assetsSegment, lang, ...rest] = segments;

  if (assetsSegment !== 'assets' || (lang !== 'en' && lang !== 'zh') || rest.length === 0) {
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

async function readImageDimensions(filePath: string): Promise<ImageDimensions | undefined> {
  let buffer: Buffer;
  try {
    buffer = await fs.readFile(filePath);
  } catch {
    return undefined;
  }

  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  if (path.extname(filePath).toLowerCase() === '.svg') {
    return readSvgDimensions(buffer.toString('utf8'));
  }

  return undefined;
}

function readSvgDimensions(svg: string): ImageDimensions | undefined {
  const viewBox = svg.match(/\bviewBox=["']\s*[-.\d]+\s+[-.\d]+\s+([.\d]+)\s+([.\d]+)\s*["']/i);
  if (viewBox != null) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2])),
    };
  }

  const widthMatch = svg.match(/\bwidth=["']([.\d]+)(?:px)?["']/i);
  const heightMatch = svg.match(/\bheight=["']([.\d]+)(?:px)?["']/i);
  if (widthMatch != null && heightMatch != null) {
    return {
      width: Math.round(Number(widthMatch[1])),
      height: Math.round(Number(heightMatch[1])),
    };
  }

  return undefined;
}
