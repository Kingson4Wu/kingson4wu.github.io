import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { createContentDraft, parseNewContentArgs } from '../site/content/newContent.js';

describe('new content scaffolding', () => {
  it('creates a Chinese post draft with stable frontmatter and URL', async () => {
    const contentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));

    const result = await createContentDraft({
      contentDir,
      lang: 'zh',
      type: 'post',
      title: '新的文章',
      slug: '20260703-new-post',
      date: new Date('2026-07-03T14:30:00.000Z'),
      tags: ['AI', 'Agent'],
    });

    const markdown = await fs.readFile(result.filePath, 'utf8');

    expect(result.relativePath).toBe('zh/posts/20260703-new-post.md');
    expect(result.url).toBe('/zh/posts/20260703-new-post/');
    expect(markdown).toContain('title: 新的文章');
    expect(markdown).toContain("date: '2026-07-03T14:30:00.000Z'");
    expect(markdown).toContain('lang: zh');
    expect(markdown).toContain('type: post');
    expect(markdown).toContain('slug: 20260703-new-post');
    expect(markdown).toContain('  - AI');
    expect(markdown).toContain('  - Agent');
    expect(markdown).toContain('\n\n<!-- Write the article here. -->\n');
  });

  it('generates a dated slug from an English title when slug is omitted', async () => {
    const contentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));

    const result = await createContentDraft({
      contentDir,
      lang: 'en',
      type: 'note',
      title: 'Agent Runtime and Skill Convergence',
      date: new Date('2026-07-03T00:00:00.000Z'),
      tags: [],
    });

    expect(result.relativePath).toBe('en/notes/20260703-agent-runtime-and-skill-convergence.md');
    expect(result.url).toBe('/en/notes/20260703-agent-runtime-and-skill-convergence/');
  });

  it('refuses to overwrite an existing content file', async () => {
    const contentDir = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(contentDir, 'zh/posts'), { recursive: true });
    await fs.writeFile(path.join(contentDir, 'zh/posts/existing.md'), 'old');

    await expect(createContentDraft({
      contentDir,
      lang: 'zh',
      type: 'post',
      title: 'Existing',
      slug: 'existing',
      date: new Date('2026-07-03T00:00:00.000Z'),
      tags: [],
    })).rejects.toThrow('Content file already exists');
  });

  it('parses CLI arguments for a new draft', () => {
    const parsed = parseNewContentArgs([
      '--lang',
      'zh',
      '--type',
      'post',
      '--title',
      '标题',
      '--slug',
      '20260703-title',
      '--tags',
      'AI,Agent',
      '--description',
      '摘要',
      '--assets',
    ]);

    expect(parsed).toEqual({
      lang: 'zh',
      type: 'post',
      title: '标题',
      slug: '20260703-title',
      tags: ['AI', 'Agent'],
      description: '摘要',
      createAssetsDir: true,
    });
  });

  it('rejects unknown CLI options instead of ignoring typos', () => {
    expect(() => parseNewContentArgs([
      '--lang',
      'zh',
      '--type',
      'post',
      '--title',
      '标题',
      '--tag',
      'AI',
    ])).toThrow('Unknown option: --tag');
  });
});
