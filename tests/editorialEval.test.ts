import { describe, expect, it } from 'vitest';
import { evaluateEditorial } from '../site/eval/editorial.js';

describe('evaluateEditorial', () => {
  it('flags editorial process language in prose with a location', () => {
    const findings = evaluateEditorial('/article.md', '## Start\n\n对这篇文章来说，先看机制。');
    expect(findings).toEqual([expect.objectContaining({ rule: 'editorial-aside', line: 3, severity: 'warning' })]);
  });

  it('does not flag a quoted example in a fenced code block or natural first person', () => {
    const body = '```md\n对这篇文章来说\n```\n\n我在项目里遇到过这个问题。';
    expect(evaluateEditorial('/article.md', body)).toEqual([]);
  });

  it('flags an unusually long prose paragraph but not a table', () => {
    const long = '一个具体的工程问题。'.repeat(65);
    const findings = evaluateEditorial('/article.md', `## Start\n\n${long}\n\n| A | B |\n| --- | --- |`);
    expect(findings.map((item) => item.rule)).toEqual(['long-paragraph']);
  });

  it('flags a standalone pile of links as advisory', () => {
    const body = '结论。\n\n[Paper](https://example.org/paper)\n[Docs](https://example.org/docs)\n[Guide](https://example.org/guide)';
    expect(evaluateEditorial('/article.md', body).map((item) => item.rule)).toContain('link-pile');
  });

  it('does not merge table rows into the prose paragraph before them', () => {
    const body = `Intro.\n\n| Topic | Detail |\n| --- | --- |\n| A | 对这篇文章来说，${'Long cell '.repeat(80)} |`;
    expect(evaluateEditorial('/article.md', body)).toEqual([]);
  });

  it('measures visible prose instead of counting URL characters', () => {
    const link = `[source](https://example.org/${'long-path-'.repeat(60)})`;
    expect(evaluateEditorial('/article.md', `One concise point with ${link}.`)).toEqual([]);
  });

  it('does not treat a labeled bibliography as an unexplained link pile', () => {
    const body = '## 参考资料\n\n- [Paper](https://example.org/paper)\n- [Docs](https://example.org/docs)\n- [Guide](https://example.org/guide)';
    expect(evaluateEditorial('/article.md', body)).toEqual([]);
  });

  it('ignores raw preformatted blocks and Chinese numbered lists', () => {
    const body = `<pre>\n${'对这篇文章来说，命令输出。'.repeat(60)}\n</pre>\n\n（1）${'列表内容。'.repeat(110)}\n（2）下一项。`;
    expect(evaluateEditorial('/article.md', body)).toEqual([]);
  });
});
