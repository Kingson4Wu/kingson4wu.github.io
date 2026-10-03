import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../site/content/loadContent.js';
import { evaluateContent } from '../site/eval/contentEval.js';

async function fixture(files: Record<string, string>) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-eval-'));
  for (const [name, body] of Object.entries(files)) {
    const file = path.join(root, name);
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.writeFile(file, body);
  }
  return { root, content: await loadContent(root) };
}

const article = (slug: string, body: string, extra = '') =>
  `---\ntitle: Sample\ndate: '2026-10-02T00:00:00.000Z'\nlang: zh\ntype: post\nslug: ${slug}\ndescription: A useful summary\ntags:\n  - Engineering\n${extra}---\n\n${body}`;

describe('evaluateContent', () => {
  it('accepts valid article links and heading fragments', async () => {
    const { root, content } = await fixture({
      'zh/posts/target.md': article('target', '## Details\n\nContent.'),
      'zh/posts/source.md': article('source', '[Read](/zh/posts/target/#details)'),
    });
    expect(await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: true }])).toEqual([]);
  });

  it('reports missing article routes and fragments with a source line', async () => {
    const { root, content } = await fixture({
      'zh/posts/target.md': article('target', '## 工作原理\n\nContent.'),
      'zh/posts/source.md': article('source', '[Missing](/zh/posts/absent/)\n\n[Wrong anchor](/zh/posts/target/#absent)'),
    });
    const findings = await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: false }]);
    expect(findings.map((item) => [item.rule, item.line, item.severity])).toEqual([
      ['internal-link', 12, 'error'],
      ['internal-anchor', 14, 'error'],
    ]);
  });

  it('ignores link-looking text in code fences', async () => {
    const { root, content } = await fixture({
      'zh/posts/source.md': article('source', '```md\n[Example](/zh/posts/missing/)\n```'),
    });
    expect(await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: false }])).toEqual([]);
  });

  it('locates a non-ASCII fragment in the Markdown source after URL encoding', async () => {
    const { root, content } = await fixture({
      'zh/posts/source.md': article('source', 'Intro.\n\n[Read](/zh/posts/source/#不存在)'),
    });
    const findings = await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: false }]);
    expect(findings).toContainEqual(expect.objectContaining({ rule: 'internal-anchor', line: 14 }));
  });

  it('checks absolute links to this blog and obsolete article paths', async () => {
    const { root, content } = await fixture({
      'zh/posts/source.md': article('source', '[Same site](https://kingson4wu.github.io/zh/posts/absent/)\n\n[Old route](https://kingson4wu.github.io/2020/07/12/old-post/)'),
    });
    const findings = await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: false }]);
    expect(findings.map((item) => [item.rule, item.line])).toEqual([
      ['internal-link', 12],
      ['legacy-article-link', 14],
    ]);
  });

  it('requires new article metadata to agree with its source path', async () => {
    const { root, content } = await fixture({
      'zh/posts/source.md': article('wrong-slug', 'Content.').replace('lang: zh', 'lang: en'),
    });
    const findings = await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: true }]);
    expect(findings.map((item) => item.rule)).toEqual(['frontmatter-lang', 'frontmatter-slug']);
  });

  it('checks existing article language and type without rejecting legacy slugs', async () => {
    const { root, content } = await fixture({
      'zh/posts/source.md': article('legacy-public-url', 'Content.').replace('lang: zh', 'lang: en').replace('type: post', 'type: note'),
    });
    const findings = await evaluateContent(content.posts, [{ path: path.join(root, 'zh/posts/source.md'), isNew: false }]);
    expect(findings.map((item) => item.rule)).toEqual(['frontmatter-lang', 'frontmatter-type']);
  });
});
