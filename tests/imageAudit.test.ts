import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditPostImages, findImageReferences } from '../site/content/imageAudit.js';

describe('image audit', () => {
  it('finds Markdown and HTML image references with alt text and captions', () => {
    const markdown = [
      '![](/assets/zh/posts/sample/empty.png)',
      '![Pipeline](/assets/zh/posts/sample/pipeline.svg)',
      '<figure>',
      '  <img src="/assets/zh/posts/sample/flow.svg" alt="Flow diagram">',
      '  <figcaption>Flow from request to response.</figcaption>',
      '</figure>',
      '<img src="/assets/zh/posts/sample/no-alt.png">',
    ].join('\n');

    expect(findImageReferences(markdown)).toEqual([
      {
        kind: 'markdown',
        url: '/assets/zh/posts/sample/empty.png',
        alt: '',
        hasCaption: false,
      },
      {
        kind: 'markdown',
        url: '/assets/zh/posts/sample/pipeline.svg',
        alt: 'Pipeline',
        hasCaption: false,
      },
      {
        kind: 'html',
        url: '/assets/zh/posts/sample/flow.svg',
        alt: 'Flow diagram',
        hasCaption: true,
      },
      {
        kind: 'html',
        url: '/assets/zh/posts/sample/no-alt.png',
        alt: '',
        hasCaption: false,
      },
    ]);
  });

  it('warns for empty alt text, bare images, and very tall local images', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-audit-'));
    const assetDir = path.join(root, 'zh/assets/posts/sample');
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, 'tall.png'), makePngHeader(400, 5000));
    await fs.writeFile(path.join(assetDir, 'normal.svg'), '<svg viewBox="0 0 900 360"></svg>');

    const warnings = await auditPostImages({
      inputPath: 'content/zh/posts/sample.md',
      body: [
        '![](/assets/zh/posts/sample/tall.png)',
        '![Normal](/assets/zh/posts/sample/normal.svg)',
        '<figure><img src="/assets/zh/posts/sample/normal.svg" alt="Normal flow"><figcaption>Normal flow.</figcaption></figure>',
      ].join('\n'),
      contentDir: root,
    });

    expect(warnings).toEqual([
      'Empty image alt text in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png',
      'Bare article image should use <figure> with <figcaption> in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png',
      'Very tall image in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png is 400x5000',
      'Bare article image should use <figure> with <figcaption> in content/zh/posts/sample.md: /assets/zh/posts/sample/normal.svg',
    ]);
  });
});

function makePngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.writeUInt32BE(0x0d0a1a0a, 4);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}
