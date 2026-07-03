import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { loadContent } from '../site/content/loadContent.js';
import { checkContent } from '../site/content/check.js';

describe('loadContent', () => {
  it('loads posts, renders HTML, and sorts by date descending', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'en/posts'), { recursive: true });
    await fs.writeFile(path.join(root, 'en/posts/older.md'), '---\ntitle: Older\ndate: 2020-01-01T00:00:00.000Z\nlang: en\ntype: post\nslug: older\ntags: []\n---\n\nOlder');
    await fs.writeFile(path.join(root, 'en/posts/newer.md'), '---\ntitle: Newer\ndate: 2021-01-01T00:00:00.000Z\nlang: en\ntype: post\nslug: newer\ntags: []\n---\n\nNewer');

    const content = await loadContent(root);

    expect(content.posts.map((post) => post.slug)).toEqual(['newer', 'older']);
    expect(content.posts[0].html).toContain('<p>Newer</p>');
    expect(content.byLang.en).toHaveLength(2);
  });

  it('checks encoded asset URLs against decoded content asset paths', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/assets/posts/sample'), { recursive: true });
    await fs.writeFile(path.join(root, 'zh/assets/posts/sample/identify protocol.png'), 'image');
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![](/assets/zh/posts/sample/identify%20protocol.png)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('reports missing encoded asset URLs as errors', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![](/assets/zh/posts/sample/missing%20image.png)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([
      expect.stringContaining(path.join('zh', 'assets', 'posts', 'sample', 'missing image.png')),
    ]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects missing title frontmatter with a useful error', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'en/posts'), { recursive: true });
    await fs.writeFile(
      path.join(root, 'en/posts/missing-title.md'),
      '---\ndate: 2021-01-01T00:00:00.000Z\nlang: en\ntype: post\nslug: missing-title\ntags: []\n---\n\nMissing title',
    );

    await expect(loadContent(root)).rejects.toThrow('Frontmatter field "title" is required');
  });

  it('checks Markdown asset URLs with balanced parentheses in the filename', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/assets/posts/sample/images'), { recursive: true });
    await fs.writeFile(path.join(root, 'zh/assets/posts/sample/images/foo (1).png'), 'image');
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![x](/assets/zh/posts/sample/images/foo%20(1).png)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects asset URLs that traverse outside the language asset root', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.writeFile(path.join(root, 'package.json'), '{}');
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![](/assets/zh/%2e%2e/%2e%2e/package.json)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([expect.stringContaining('/assets/zh/%2e%2e/%2e%2e/package.json')]);
    expect(result.warnings).toEqual([]);
  });

  it('rejects asset URLs with encoded slash segments', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/assets/posts/sample/foo'), { recursive: true });
    await fs.writeFile(path.join(root, 'zh/assets/posts/sample/foo/bar.png'), 'image');
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![](/assets/zh/posts/sample/foo%2Fbar.png)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([expect.stringContaining('/assets/zh/posts/sample/foo%2Fbar.png')]);
    expect(result.warnings).toEqual([]);
  });
});
