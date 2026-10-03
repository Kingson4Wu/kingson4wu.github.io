import type { Diagnostic } from './contentEval.js';

const asidePattern = /对这篇文章来说|本文将(?:会|要)?|下面我们(?:来|将)|接下来我们(?:来|将)/;
const standaloneLinkPattern = /^\s*(?:[-*]\s*)?\[[^\]]+\]\(https?:\/\/[^)]+\)\s*$/;

export function evaluateEditorial(file: string, body: string): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const paragraphs: Array<{ line: number; lines: string[]; bibliography: boolean }> = [];
  const lines = body.split('\n');
  let current: { line: number; lines: string[]; bibliography: boolean } | undefined;
  let fence: string | undefined;
  let rawPre = false;
  let bibliography = false;
  const flush = () => {
    if (current != null) paragraphs.push(current);
    current = undefined;
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    if (/<pre\b/i.test(line)) { flush(); rawPre = true; }
    if (rawPre) {
      if (/<\/pre\s*>/i.test(line)) rawPre = false;
      continue;
    }
    const marker = line.trim().match(/^(`{3,}|~{3,})/);
    if (marker != null) {
      flush();
      if (fence == null) fence = marker[1][0];
      else if (marker[1][0] === fence) fence = undefined;
      continue;
    }
    const heading = line.trim().match(/^#{1,6}\s+(.+)$/);
    if (heading != null || /^\*\*参考资料\*\*$/.test(line.trim())) {
      flush();
      const title = heading?.[1].trim() ?? '参考资料';
      bibliography = /^(参考|延伸阅读|References?\b)/i.test(title);
      continue;
    }
    if (fence != null || !line.trim() || /^\s*(?:#{1,6}\s|[>|]|[-*+]\s|(?:\d+[.、]|（\d+）|\(\d+\))\s*|<|\$\$)/.test(line) && !standaloneLinkPattern.test(line)) {
      flush();
      continue;
    }
    if (current == null) current = { line: index + 1, lines: [], bibliography };
    current.lines.push(line);
  }
  flush();

  for (const paragraph of paragraphs) {
    const text = paragraph.lines.join(' ').trim();
    const visibleText = text.replace(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g, '$1');
    if (asidePattern.test(text)) {
      diagnostics.push({ file, line: paragraph.line, rule: 'editorial-aside', severity: 'warning', message: 'Narration about writing the article may interrupt the explanation; review in context' });
    }
    if (visibleText.length > 500 && !paragraph.lines.some((line) => line.trim().startsWith('|') || standaloneLinkPattern.test(line))) {
      diagnostics.push({ file, line: paragraph.line, rule: 'long-paragraph', severity: 'warning', message: `Prose paragraph has ${visibleText.length} visible characters; consider whether one split would help` });
    }
    if (!paragraph.bibliography && paragraph.lines.length >= 3 && paragraph.lines.every((line) => standaloneLinkPattern.test(line))) {
      diagnostics.push({ file, line: paragraph.line, rule: 'link-pile', severity: 'warning', message: 'Several standalone links appear without an explanation of their relevance' });
    }
  }
  return diagnostics;
}
