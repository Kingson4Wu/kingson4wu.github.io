import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createReleaseManifest } from '../site/eval/releaseManifest.js';

it('records exact bytes for changed article routes and encoded tag paths', async () => {
  const dist = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-release-'));
  await fs.mkdir(path.join(dist, 'zh/posts/old-slug'), { recursive: true });
  await fs.mkdir(path.join(dist, 'zh/tags/Prompt Engineering'), { recursive: true });
  await fs.writeFile(path.join(dist, 'zh/posts/old-slug/index.html'), '<title>Old article</title>');
  await fs.writeFile(path.join(dist, 'zh/tags/Prompt Engineering/index.html'), '<title>Tag</title>');

  const manifest = await createReleaseManifest(dist, 'abc123', ['/zh/posts/old-slug/', '/zh/tags/Prompt%20Engineering/']);

  expect(manifest.commit).toBe('abc123');
  expect(manifest.pages).toContainEqual({
    route: '/zh/posts/old-slug/',
    sha256: createHash('sha256').update('<title>Old article</title>').digest('hex'),
  });
  expect(manifest.pages).toHaveLength(2);
});
