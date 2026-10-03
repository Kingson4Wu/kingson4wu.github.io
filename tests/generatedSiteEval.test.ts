import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditGeneratedSite } from '../site/eval/generatedSite.js';

describe('auditGeneratedSite', () => {
  it('checks links from every rendered page to pages, fragments and local assets', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-generated-eval-'));
    await fs.mkdir(path.join(root, 'zh/posts/old'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/about'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/tags/Prompt Engineering'), { recursive: true });
    await fs.mkdir(path.join(root, 'assets'), { recursive: true });
    await fs.writeFile(path.join(root, 'zh/about/index.html'), '<h2 id="author">Author</h2>');
    await fs.writeFile(path.join(root, 'zh/tags/Prompt Engineering/index.html'), '<h1>Tag</h1>');
    await fs.writeFile(path.join(root, 'assets/photo.svg'), '<svg/>');
    await fs.writeFile(path.join(root, 'zh/posts/old/index.html'), `
      <a href="/zh/about/#author">Valid</a>
      <a href="/zh/tags/Prompt%20Engineering/">Encoded tag</a>
      <img src="/assets/photo.svg">
      <a href="/zh/posts/deleted/">Deleted article</a>
      <a href="/zh/about/#missing">Missing heading</a>
      <script src="/scripts/missing.js"></script>
      <a href="https://example.com/elsewhere">External</a>
    `);

    const result = await auditGeneratedSite(root);

    expect(result.pages).toBe(3);
    expect(result.errors.map((item) => [item.href, item.rule])).toEqual([
      ['/zh/posts/deleted/', 'missing-generated-target'],
      ['/zh/about/#missing', 'missing-generated-fragment'],
      ['/scripts/missing.js', 'missing-generated-target'],
    ]);
  });

  it('rejects an encoded directory that the published server will not resolve', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-generated-eval-'));
    await fs.mkdir(path.join(root, 'zh/tags/Prompt%20Engineering'), { recursive: true });
    await fs.writeFile(path.join(root, 'index.html'), '<a href="/zh/tags/Prompt%20Engineering/">Tag</a>');
    await fs.writeFile(path.join(root, 'zh/tags/Prompt%20Engineering/index.html'), '<h1>Tag</h1>');

    const result = await auditGeneratedSite(root);

    expect(result.errors).toContainEqual(expect.objectContaining({ href: '/zh/tags/Prompt%20Engineering/', rule: 'missing-generated-target' }));
  });
});
