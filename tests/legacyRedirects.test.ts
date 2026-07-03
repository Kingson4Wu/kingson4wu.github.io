import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { loadLegacyRedirects, redirectOutputPath } from '../site/content/legacyRedirects.js';
import type { Post } from '../site/types.js';

let tempDir: string;

const post = {
  url: '/zh/posts/example/',
} as Post;

describe('legacy redirects', () => {
  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'legacy-redirects-'));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it('loads redirects and maps old urls to output files', async () => {
    const filePath = path.join(tempDir, 'legacy-redirects.json');
    await fs.writeFile(filePath, JSON.stringify([{ from: '/zh/2020/01/01/old-path/', to: post.url }]));

    const redirects = await loadLegacyRedirects(filePath, [post]);

    expect(redirects).toEqual([{ from: '/zh/2020/01/01/old-path/', to: '/zh/posts/example/' }]);
    expect(redirectOutputPath(redirects[0].from)).toBe(path.join('zh', '2020', '01', '01', 'old-path', 'index.html'));
  });

  it('rejects redirects to missing posts', async () => {
    const filePath = path.join(tempDir, 'legacy-redirects.json');
    await fs.writeFile(filePath, JSON.stringify([{ from: '/zh/2020/01/01/old-path/', to: '/zh/posts/missing/' }]));

    await expect(loadLegacyRedirects(filePath, [post])).rejects.toThrow('target does not exist');
  });
});
