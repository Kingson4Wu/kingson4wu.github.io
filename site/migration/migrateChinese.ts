import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import fse from 'fs-extra';
import matter from 'gray-matter';
import { normalizeFrontmatter, type NormalizedFrontmatter } from '../content/frontmatter.js';
import type { ContentType } from '../types.js';
import { writeFileEnsured } from '../utils/fs.js';
import { ensureUniqueSlug, slugFromFilename } from '../utils/slug.js';
import { publicAssetPath, rewriteMarkdownImagePaths } from './images.js';

interface MigrateChineseOptions {
  legacyDir: string;
  contentDir: string;
}

interface MigrateChineseResult {
  markdown: number;
  missingImages: string[];
}

export async function migrateChinese(options: MigrateChineseOptions): Promise<MigrateChineseResult> {
  const postsDir = path.join(options.legacyDir, 'source/_posts');
  const files = await fg('*.md', { cwd: postsDir, absolute: true });
  const seen = new Set<string>();
  const missingImages: string[] = [];

  await Promise.all([
    fse.emptyDir(path.join(options.contentDir, 'zh/posts')),
    fse.emptyDir(path.join(options.contentDir, 'zh/notes')),
    fse.emptyDir(path.join(options.contentDir, 'zh/assets/posts')),
    fse.emptyDir(path.join(options.contentDir, 'zh/assets/notes')),
    fse.emptyDir(path.join(options.contentDir, 'zh/assets/shared')),
  ]);

  for (const file of files.sort()) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = matter(raw.trimStart());
    const type = isNote(parsed.data) ? 'note' : 'post';
    const slug = ensureUniqueSlug(slugFromFilename(path.basename(file)), seen);
    const sourcePath = toPosixPath(path.relative(options.legacyDir, file));
    const normalized = normalizeFrontmatter({
      raw: parsed.data,
      rawFrontmatter: parsed.matter,
      lang: 'zh',
      type,
      fallbackSlug: slug,
      sourcePath,
      sourceRepo: 'zh',
    });

    const rewritten = rewriteMarkdownImagePaths(parsed.content.trimStart(), {
      lang: 'zh',
      type,
      slug: normalized.slug,
    });

    const oldAssetDir = await findArticleAssetDir(postsDir, file, slug);
    const plural = type === 'post' ? 'posts' : 'notes';
    const newAssetDir = path.join(options.contentDir, 'zh/assets', plural, normalized.slug);

    let markdown = rewritten.markdown;
    for (const reference of rewritten.references) {
      if (reference.startsWith('photo/')) {
        const normalizedReference = normalizeReferencePath(reference);
        const source = path.join(postsDir, normalizedReference);
        if (!(await fse.pathExists(source))) {
          missingImages.push(`${sourcePath} -> ${reference}`);
          continue;
        }

        await fse.copy(source, path.join(options.contentDir, 'zh/assets/shared', normalizedReference));
        continue;
      }

      const resolved = oldAssetDir == null ? null : await resolveArticleReference(oldAssetDir, reference);
      if (resolved == null) {
        missingImages.push(`${sourcePath} -> ${reference}`);
        continue;
      }

      await fse.copy(resolved.sourcePath, path.join(newAssetDir, resolved.relativePath));

      const normalizedReference = normalizeReferencePath(reference);
      if (resolved.relativePath !== normalizedReference) {
        markdown = markdown
          .split(publicAssetPath(reference, { lang: 'zh', type, slug: normalized.slug }))
          .join(publicAssetPath(resolved.relativePath, { lang: 'zh', type, slug: normalized.slug }));
      }
    }

    const targetSubdir = type === 'post' ? 'zh/posts' : 'zh/notes';
    const target = path.join(options.contentDir, targetSubdir, `${normalized.slug}.md`);
    await writeFileEnsured(target, serializeMarkdown(markdown, normalized));
  }

  return { markdown: files.length, missingImages };
}

function isNote(data: Record<string, unknown>): boolean {
  const categories = data.categories;
  const values = Array.isArray(categories) ? categories : [categories];
  return values.some((value) => String(value).toLowerCase() === 'notes');
}

async function findArticleAssetDir(postsDir: string, file: string, slug: string): Promise<string | null> {
  const exact = file.replace(/\.md$/i, '');
  if (await fse.pathExists(exact)) {
    return exact;
  }

  const entries = await fs.readdir(postsDir, { withFileTypes: true });
  const match = entries.find((entry) => {
    if (!entry.isDirectory()) {
      return false;
    }

    return slugFromFilename(`${entry.name}.md`) === slug;
  });

  return match == null ? null : path.join(postsDir, match.name);
}

async function resolveArticleReference(
  assetDir: string,
  reference: string,
): Promise<{ sourcePath: string; relativePath: string } | null> {
  const normalizedReference = normalizeReferencePath(reference);
  const exact = path.join(assetDir, normalizedReference);
  if (await fse.pathExists(exact)) {
    return { sourcePath: exact, relativePath: normalizedReference };
  }

  if (normalizedReference.includes('/')) {
    const basename = path.basename(normalizedReference);
    const basenameMatch = path.join(assetDir, basename);
    if (await fse.pathExists(basenameMatch)) {
      return { sourcePath: basenameMatch, relativePath: basename };
    }
  }

  return null;
}

function normalizeReferencePath(reference: string): string {
  return reference.replace(/^\.\/+/, '');
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
