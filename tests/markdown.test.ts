import { describe, expect, it } from 'vitest';
import { createExcerpt, renderMarkdown } from '../site/content/markdown.js';

describe('markdown rendering', () => {
  it('renders headings, code, and tables', () => {
    const html = renderMarkdown('## Title\n\n### 标题\n\n| A | B |\n| - | - |\n| 1 | 2 |\n\n```ts\nconst x = 1;\n```');
    expect(html).toContain('<h2 id="title" data-heading-text="Title"');
    expect(html).toContain('<h3 id="section-2" data-heading-text="标题"');
    expect(html).toContain('<table>');
    expect(html).toContain('class="code-block"');
    expect(html).toContain('data-language="ts"');
    expect(html).toContain('<span class="code-language">ts</span>');
    expect(html).toContain('language-ts');
  });

  it('deduplicates repeated heading anchors', () => {
    const html = renderMarkdown('## Same\n\n## Same');
    expect(html).toContain('<h2 id="same"');
    expect(html).toContain('<h2 id="same-2"');
  });

  it('stores clean heading text for math headings', () => {
    const html = renderMarkdown('### $W_O$ 的关键作用');
    expect(html).toContain('data-heading-text="W_O 的关键作用"');
  });

  it('renders inline and display math with KaTeX', () => {
    const html = renderMarkdown('Inline math: \\\\(a^2 + b^2 = c^2\\\\) and $\\sqrt{d_k}$\n\n$$\nE = mc^2\n$$');
    expect(html).toContain('class="math math-inline"');
    expect(html).toContain('class="math math-display"');
    expect(html).toContain('class="katex"');
    expect(html).not.toContain('\\\\(a^2 + b^2 = c^2\\\\)');
    expect(html).not.toContain('$\\sqrt{d_k}$');
    expect(html).not.toContain('$$');
  });

  it('keeps ordinary dollar text as text', () => {
    const html = renderMarkdown('Cost is $5 and $6.');
    expect(html).not.toContain('class="math math-inline"');
    expect(html).toContain('$5');
    expect(html).toContain('$6');
  });

  it('removes invisible trailing whitespace from rendered code lines', () => {
    const html = renderMarkdown('```text\nvalue   \n```');
    expect(html).toContain('value\n');
    expect(html).not.toContain('value   ');
  });

  it('creates a clean text excerpt', () => {
    expect(createExcerpt('<p>Hello <strong>world</strong>. This is enough.</p>', 11)).toBe('Hello world...');
  });
});
