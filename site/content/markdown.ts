import hljs from 'highlight.js';
import katex from 'katex';
import MarkdownIt from 'markdown-it';
import { escapeHtml, stripHtml } from '../utils/html.js';
import { slugifyTitle } from '../utils/slug.js';

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
});

md.block.ruler.before('fence', 'math_block', mathBlock, {
  alt: ['paragraph', 'reference', 'blockquote', 'list'],
});
md.renderer.rules.math_block = (tokens, index) => renderMath(tokens[index].content, true);
md.renderer.rules.text = (tokens, index) => renderTextWithInlineMath(tokens[index].content);
md.renderer.rules.fence = (tokens, index) => renderCodeBlock(tokens[index].content, tokens[index].info);
md.renderer.rules.heading_open = (tokens, index, options, env: MarkdownRenderEnv, self) => {
  const title = tokens[index + 1]?.content ?? '';
  tokens[index].attrSet('id', nextHeadingId(title, env));
  tokens[index].attrSet('data-heading-text', cleanHeadingText(title));
  return self.renderToken(tokens, index, options);
};

interface MarkdownRenderEnv {
  headingIndex?: number;
  headingCounts?: Record<string, number>;
}

export function renderMarkdown(markdown: string): string {
  return md.render(markdown, { headingIndex: 0, headingCounts: {} } satisfies MarkdownRenderEnv);
}

export function createExcerpt(html: string, maxLength = 160): string {
  const text = stripHtml(html);
  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength).trim()}...`;
}

function mathBlock(state: any, startLine: number, endLine: number, silent: boolean): boolean {
  const start = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const openingLine = state.src.slice(start, max);
  const opening = openingLine.trim();
  const marker = opening.startsWith('$$') ? '$$' : opening.startsWith('\\[') ? '\\[' : undefined;

  if (marker == null) {
    return false;
  }

  if (silent) {
    return true;
  }

  const closingMarker = marker === '$$' ? '$$' : '\\]';
  const firstLine = opening.slice(marker.length).trim();
  const lines: string[] = [];
  let nextLine = startLine;

  if (firstLine.endsWith(closingMarker) && firstLine.length > closingMarker.length) {
    lines.push(firstLine.slice(0, -closingMarker.length).trim());
  } else {
    if (firstLine.length > 0) {
      lines.push(firstLine);
    }

    for (nextLine = startLine + 1; nextLine < endLine; nextLine += 1) {
      const lineStart = state.bMarks[nextLine] + state.tShift[nextLine];
      const lineEnd = state.eMarks[nextLine];
      const line = state.src.slice(lineStart, lineEnd);
      const closingIndex = line.indexOf(closingMarker);

      if (closingIndex >= 0) {
        lines.push(line.slice(0, closingIndex));
        break;
      }

      lines.push(line);
    }

    if (nextLine >= endLine) {
      return false;
    }
  }

  const token = state.push('math_block', 'div', 0);
  token.block = true;
  token.content = lines.join('\n').trim();
  token.markup = marker;
  token.map = [startLine, nextLine + 1];
  state.line = nextLine + 1;
  return true;
}

function renderMath(source: string, displayMode: boolean): string {
  const html = katex.renderToString(source, {
    displayMode,
    throwOnError: false,
    output: 'htmlAndMathml',
  });

  if (displayMode) {
    return `<div class="math math-display">${html}</div>\n`;
  }

  return `<span class="math math-inline">${html}</span>`;
}

function renderTextWithInlineMath(text: string): string {
  const parts: string[] = [];
  let cursor = 0;
  let literalStart = 0;

  while (cursor < text.length) {
    if (text.startsWith('\\(', cursor)) {
      const closingIndex = findInlineMathClosing(text, cursor + 2, '\\)');

      if (closingIndex >= 0) {
        parts.push(escapeHtml(text.slice(literalStart, cursor)));
        parts.push(renderMath(text.slice(cursor + 2, closingIndex).trim(), false));
        cursor = closingIndex + 2;
        literalStart = cursor;
        continue;
      }
    }

    if (text[cursor] === '$' && isDollarMathOpening(text, cursor)) {
      const closingIndex = findDollarMathClosing(text, cursor + 1);

      if (closingIndex >= 0) {
        parts.push(escapeHtml(text.slice(literalStart, cursor)));
        parts.push(renderMath(text.slice(cursor + 1, closingIndex).trim(), false));
        cursor = closingIndex + 1;
        literalStart = cursor;
        continue;
      }
    }

    cursor += 1;
  }

  parts.push(escapeHtml(text.slice(literalStart)));
  return parts.join('');
}

function nextHeadingId(title: string, env: MarkdownRenderEnv): string {
  env.headingIndex = (env.headingIndex ?? 0) + 1;
  const slug = slugifyTitle(title);
  const base = slug === 'post' ? `section-${env.headingIndex}` : slug;
  const counts = env.headingCounts ?? {};
  const count = (counts[base] ?? 0) + 1;
  counts[base] = count;
  env.headingCounts = counts;

  return count === 1 ? base : `${base}-${count}`;
}

function cleanHeadingText(title: string): string {
  return title
    .replace(/\\\(([\s\S]*?)\\\)/g, '$1')
    .replace(/\$([^$\n]+)\$/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function findInlineMathClosing(text: string, startIndex: number, closingMarker: string): number {
  let index = text.indexOf(closingMarker, startIndex);

  while (index >= 0) {
    if (!isEscaped(text, index)) {
      return index;
    }

    index = text.indexOf(closingMarker, index + closingMarker.length);
  }

  return -1;
}

function findDollarMathClosing(text: string, startIndex: number): number {
  for (let index = startIndex; index < text.length; index += 1) {
    if (text[index] === '$' && isDollarMathClosing(text, index)) {
      return index;
    }
  }

  return -1;
}

function isDollarMathOpening(text: string, index: number): boolean {
  const next = text[index + 1];

  return !isEscaped(text, index)
    && next != null
    && next !== '$'
    && !/\s/.test(next);
}

function isDollarMathClosing(text: string, index: number): boolean {
  const previous = text[index - 1];
  const next = text[index + 1];

  return !isEscaped(text, index)
    && previous != null
    && !/\s/.test(previous)
    && next !== '$'
    && !/[0-9A-Za-z]/.test(next ?? '');
}

function isEscaped(text: string, index: number): boolean {
  let slashCount = 0;

  for (let cursor = index - 1; cursor >= 0 && text[cursor] === '\\'; cursor -= 1) {
    slashCount += 1;
  }

  return slashCount % 2 === 1;
}

function renderCodeBlock(code: string, info: string): string {
  const language = normalizeLanguage(info);
  const normalizedCode = code.replace(/[ \t]+$/gm, '');
  const highlighted = language && hljs.getLanguage(language)
    ? hljs.highlight(normalizedCode, { language, ignoreIllegals: true }).value
    : escapeHtml(normalizedCode);
  const languageClass = language ? ` language-${escapeHtml(language)}` : '';
  const languageAttr = language ? ` data-language="${escapeHtml(language)}"` : '';
  const languageLabel = language
    ? `<div class="code-header"><span class="code-language">${escapeHtml(language)}</span></div>`
    : '';

  return `<div class="code-block"${languageAttr}>${languageLabel}<pre><code class="hljs${languageClass}">${highlighted}</code></pre></div>\n`;
}

function normalizeLanguage(info: string): string | undefined {
  const language = info.trim().split(/\s+/)[0]?.toLowerCase();
  return language.length > 0 ? language : undefined;
}
