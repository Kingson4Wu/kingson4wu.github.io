import type { ContentType, Lang } from '../types.js';

interface RewriteContext {
  lang: Lang;
  type: ContentType;
  slug: string;
}

interface RewriteResult {
  markdown: string;
  references: string[];
}

function isExternal(value: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(value);
}

export function publicAssetPath(src: string, context: RewriteContext): string {
  if (src.startsWith('photo/')) {
    return `/assets/${context.lang}/shared/${encodePathSegments(src)}`;
  }

  const plural = context.type === 'post' ? 'posts' : 'notes';
  return `/assets/${context.lang}/${plural}/${context.slug}/${encodePathSegments(src)}`;
}

function encodePathSegments(src: string): string {
  return src
    .split('/')
    .map((segment) => encodeURIComponent(decodePathSegment(segment)))
    .join('/');
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

function splitMarkdownDestination(value: string): { src: string; title: string } {
  const trimmed = value.trim();
  const titleMatch = /^(.*\S)(\s+(?:"[^"]*"|'[^']*'|\([^()]*\)))$/.exec(trimmed);

  if (!titleMatch) {
    return { src: trimmed, title: '' };
  }

  return { src: titleMatch[1], title: titleMatch[2] };
}

function findMarkdownDestinationEnd(markdown: string, start: number): number {
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

  return -1;
}

function rewriteMarkdownImageReferences(markdown: string, context: RewriteContext, references: string[]): string {
  let rewritten = '';
  let cursor = 0;
  const imageStartPattern = /!\[([^\]]*)\]\(/g;

  for (let match = imageStartPattern.exec(markdown); match; match = imageStartPattern.exec(markdown)) {
    const destinationStart = imageStartPattern.lastIndex;
    const destinationEnd = findMarkdownDestinationEnd(markdown, destinationStart);

    if (destinationEnd === -1) {
      continue;
    }

    const rawDestination = markdown.slice(destinationStart, destinationEnd);
    const { src, title } = splitMarkdownDestination(rawDestination);

    rewritten += markdown.slice(cursor, match.index);

    if (isExternal(src)) {
      rewritten += markdown.slice(match.index, destinationEnd + 1);
    } else {
      references.push(src);
      rewritten += `![${match[1]}](${publicAssetPath(src, context)}${title})`;
    }

    cursor = destinationEnd + 1;
    imageStartPattern.lastIndex = cursor;
  }

  return rewritten + markdown.slice(cursor);
}

export function rewriteMarkdownImagePaths(markdown: string, context: RewriteContext): RewriteResult {
  const references: string[] = [];

  let rewritten = rewriteMarkdownImageReferences(markdown, context, references);

  rewritten = rewritten.replace(/<img([^>]*?)\s(src)=["']([^"']+)["']([^>]*)>/gi, (
    match,
    before: string,
    srcAttribute: string,
    src: string,
    after: string,
  ) => {
    const cleanSrc = src.trim();
    if (isExternal(cleanSrc)) {
      return match;
    }

    references.push(cleanSrc);
    return `${match.slice(0, 4)}${before} ${srcAttribute}="${publicAssetPath(cleanSrc, context)}"${after}>`;
  });

  return { markdown: rewritten, references };
}
