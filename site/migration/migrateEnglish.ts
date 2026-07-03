import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import fse from 'fs-extra';
import matter from 'gray-matter';
import { normalizeFrontmatter, type NormalizedFrontmatter } from '../content/frontmatter.js';
import type { ContentType } from '../types.js';
import { writeFileEnsured } from '../utils/fs.js';
import { ensureUniqueSlug, slugFromFilename } from '../utils/slug.js';

interface MigrateEnglishOptions {
  legacyDir: string;
  contentDir: string;
}

type EnglishSource = readonly [ContentType, string, string];

const sources: EnglishSource[] = [
  ['post', 'src/content/blog', 'en/posts'],
  ['note', 'src/content/notes', 'en/notes'],
];

export async function migrateEnglish(options: MigrateEnglishOptions): Promise<{ posts: number; notes: number }> {
  const seen = new Set<string>();
  let posts = 0;
  let notes = 0;

  await Promise.all(sources.map(([, , targetSubdir]) => fse.emptyDir(path.join(options.contentDir, targetSubdir))));

  for (const [type, sourceSubdir, targetSubdir] of sources) {
    const sourceDir = path.join(options.legacyDir, sourceSubdir);
    const files = await fg('*.{md,mdx}', { cwd: sourceDir, absolute: true });

    for (const file of files.sort()) {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = matter(raw.trimStart());
      const sourcePath = toPosixPath(path.relative(options.legacyDir, file));
      const slug = ensureUniqueSlug(slugFromFilename(path.basename(file)), seen);
      const normalized = normalizeFrontmatter({
        raw: parsed.data,
        rawFrontmatter: parsed.matter,
        lang: 'en',
        type,
        fallbackSlug: slug,
        sourcePath,
        sourceRepo: 'en',
      });

      const target = path.join(options.contentDir, targetSubdir, `${normalized.slug}.md`);
      await writeFileEnsured(target, serializeMarkdown(parsed.content.trimStart(), normalized));

      if (type === 'post') {
        posts += 1;
      } else {
        notes += 1;
      }
    }
  }

  return { posts, notes };
}

function serializeMarkdown(body: string, frontmatter: NormalizedFrontmatter): string {
  return matter.stringify(body, {
    title: frontmatter.title,
    date: frontmatter.date.toISOString(),
    lang: frontmatter.lang,
    type: frontmatter.type,
    slug: frontmatter.slug,
    ...(frontmatter.description ? { description: frontmatter.description } : {}),
    ...(frontmatter.updatedDate ? { updatedDate: frontmatter.updatedDate.toISOString() } : {}),
    tags: frontmatter.tags,
    source: frontmatter.source,
  });
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
