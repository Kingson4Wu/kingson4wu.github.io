import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { migrateEnglish } from '../site/migration/migrateEnglish.js';
import { migrateChinese } from '../site/migration/migrateChinese.js';

describe('migration scripts', () => {
  it('migrates English blog and notes into unified content folders', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-en-'));
    const legacy = path.join(root, 'legacy-en');
    const content = path.join(root, 'content');
    await fs.mkdir(path.join(legacy, 'src/content/blog'), { recursive: true });
    await fs.mkdir(path.join(legacy, 'src/content/notes'), { recursive: true });
    await fs.writeFile(
      path.join(legacy, 'src/content/blog/hello-world.md'),
      '---\ntitle: Hello\npubDate: 2026-01-01\ntags: [AI]\n---\n\nHello body',
    );
    await fs.writeFile(
      path.join(legacy, 'src/content/notes/tiny-note.md'),
      '---\ntitle: Tiny\npubDate: 2026-01-02\n---\n\nTiny body',
    );

    const result = await migrateEnglish({ legacyDir: legacy, contentDir: content });

    expect(result.posts).toBe(1);
    expect(result.notes).toBe(1);
    expect(await fs.readFile(path.join(content, 'en/posts/hello-world.md'), 'utf8')).toContain('lang: en');
    expect(await fs.readFile(path.join(content, 'en/notes/tiny-note.md'), 'utf8')).toContain('type: note');
  });

  it('migrates English posts with leading whitespace before frontmatter', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-en-leading-'));
    const legacy = path.join(root, 'legacy-en');
    const content = path.join(root, 'content');
    await fs.mkdir(path.join(legacy, 'src/content/blog'), { recursive: true });
    await fs.mkdir(path.join(legacy, 'src/content/notes'), { recursive: true });
    await fs.writeFile(
      path.join(legacy, 'src/content/blog/leading-frontmatter.md'),
      '\n---\ntitle: Leading\npubDate: 2026-01-03\n---\n\nBody',
    );

    const result = await migrateEnglish({ legacyDir: legacy, contentDir: content });

    expect(result.posts).toBe(1);
    expect(await fs.readFile(path.join(content, 'en/posts/leading-frontmatter.md'), 'utf8')).toContain(
      'title: Leading',
    );
  });

  it('migrates Chinese posts and rewrites local image paths', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-zh-'));
    const legacy = path.join(root, 'legacy-zh');
    const content = path.join(root, 'content');
    const posts = path.join(legacy, 'source/_posts');
    await fs.mkdir(path.join(posts, '20200101-测试文章'), { recursive: true });
    await fs.writeFile(
      path.join(posts, '20200101-测试文章.md'),
      '---\ntitle: 测试文章\ndate: 2020-01-01 08:00:00\ntags: [测试]\n---\n\n![](a.png)',
    );
    await fs.writeFile(path.join(posts, '20200101-测试文章/a.png'), 'image');

    const result = await migrateChinese({ legacyDir: legacy, contentDir: content });

    expect(result.markdown).toBe(1);
    const files = await fs.readdir(path.join(content, 'zh/posts'));
    expect(files).toHaveLength(1);
    const migratedPath = path.join(content, 'zh/posts', files[0]);
    const migrated = await fs.readFile(migratedPath, 'utf8');
    const slug = files[0].replace(/\.md$/, '');
    expect(migrated).toContain(`/assets/zh/posts/${slug}/a.png`);
    await expect(fs.stat(path.join(content, 'zh/assets/posts', slug, 'a.png'))).resolves.toBeTruthy();
    expect(migrated).toContain('2020-01-01T00:00:00.000Z');
  });

  it('migrates Chinese image references with spaces without copying unreferenced article assets', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-zh-spaces-'));
    const legacy = path.join(root, 'legacy-zh');
    const content = path.join(root, 'content');
    const posts = path.join(legacy, 'source/_posts');
    await fs.mkdir(path.join(posts, '20230730-测试文章'), { recursive: true });
    await fs.writeFile(
      path.join(posts, '20230730-测试文章.md'),
      '---\ntitle: 测试文章\ndate: 2023-07-30 12:00:00\n---\n\n![](identify protocol.png)',
    );
    await fs.writeFile(path.join(posts, '20230730-测试文章/identify protocol.png'), 'image');
    await fs.writeFile(path.join(posts, '20230730-测试文章/unused_backup.png'), 'backup');
    await fs.writeFile(path.join(posts, '20230730-测试文章/large.danmaku'), 'archive');

    const result = await migrateChinese({ legacyDir: legacy, contentDir: content });

    expect(result.missingImages).toEqual([]);
    const files = await fs.readdir(path.join(content, 'zh/posts'));
    const slug = files[0].replace(/\.md$/, '');
    const migrated = await fs.readFile(path.join(content, 'zh/posts', files[0]), 'utf8');
    expect(migrated).toContain(`/assets/zh/posts/${slug}/identify%20protocol.png`);
    await expect(fs.stat(path.join(content, 'zh/assets/posts', slug, 'identify protocol.png'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(content, 'zh/assets/posts', slug, 'unused_backup.png'))).rejects.toThrow();
    await expect(fs.stat(path.join(content, 'zh/assets/posts', slug, 'large.danmaku'))).rejects.toThrow();
  });

  it('copies only referenced shared Chinese photo assets', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-zh-shared-'));
    const legacy = path.join(root, 'legacy-zh');
    const content = path.join(root, 'content');
    const posts = path.join(legacy, 'source/_posts');
    await fs.mkdir(path.join(posts, 'photo'), { recursive: true });
    await fs.writeFile(
      path.join(posts, '20200102-共享图片.md'),
      '---\ntitle: 共享图片\ndate: 2020-01-02 08:00:00\n---\n\n![](photo/Zidane.jpeg)',
    );
    await fs.writeFile(path.join(posts, 'photo/Zidane.jpeg'), 'image');
    await fs.writeFile(path.join(posts, 'photo/Zidane_backup.jpeg'), 'backup');

    const result = await migrateChinese({ legacyDir: legacy, contentDir: content });

    expect(result.missingImages).toEqual([]);
    await expect(fs.stat(path.join(content, 'zh/assets/shared/photo/Zidane.jpeg'))).resolves.toBeTruthy();
    await expect(fs.stat(path.join(content, 'zh/assets/shared/photo/Zidane_backup.jpeg'))).rejects.toThrow();
  });

  it('resolves Chinese asset folders and references that differ from the markdown filename', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-zh-assets-'));
    const legacy = path.join(root, 'legacy-zh');
    const content = path.join(root, 'content');
    const posts = path.join(legacy, 'source/_posts');
    await fs.mkdir(path.join(posts, '20260419-Skill-机制-Anthropic'), { recursive: true });
    await fs.mkdir(path.join(posts, '20200908-金融业务容灾体系简述'), { recursive: true });
    await fs.writeFile(
      path.join(posts, '20260419-Skill-机制：Anthropic.md'),
      '---\ntitle: Skill 机制\ndate: 2026-04-19 17:10:00\n---\n\n![](diagram.png)',
    );
    await fs.writeFile(path.join(posts, '20260419-Skill-机制-Anthropic/diagram.png'), 'diagram');
    await fs.writeFile(
      path.join(posts, '20200908-金融业务容灾体系简述.md'),
      '---\ntitle: 金融业务容灾体系简述\ndate: 2020-09-08 00:04:32\n---\n\n![](20209008-金融业务容灾体系简述/availability.png)',
    );
    await fs.writeFile(path.join(posts, '20200908-金融业务容灾体系简述/availability.png'), 'availability');

    const result = await migrateChinese({ legacyDir: legacy, contentDir: content });

    expect(result.missingImages).toEqual([]);
    const files = await fs.readdir(path.join(content, 'zh/posts'));
    const skill = files.find((file) => file.startsWith('20260419-skill')) ?? '';
    const finance = files.find((file) => file.startsWith('20200908')) ?? '';
    expect(await fs.readFile(path.join(content, 'zh/posts', skill), 'utf8')).toContain(
      `/assets/zh/posts/${skill.replace(/\.md$/, '')}/diagram.png`,
    );
    expect(await fs.readFile(path.join(content, 'zh/posts', finance), 'utf8')).toContain(
      `/assets/zh/posts/${finance.replace(/\.md$/, '')}/availability.png`,
    );
  });
});
