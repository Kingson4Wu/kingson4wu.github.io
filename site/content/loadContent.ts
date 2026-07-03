import fs from 'node:fs/promises';
import path from 'node:path';
import fg from 'fast-glob';
import matter from 'gray-matter';
import type { ContentType, Lang, Post } from '../types.js';
import { normalizeFrontmatter } from './frontmatter.js';
import { createExcerpt, renderMarkdown } from './markdown.js';
import { curateTags } from './tags.js';

export interface LoadedContent {
  posts: Post[];
  byLang: Record<Lang, Post[]>;
  byTag: Record<Lang, Map<string, Post[]>>;
}

const contentPatterns = ['en/{posts,notes}/*.md', 'zh/{posts,notes}/*.md'];

export async function loadContent(contentDir: string): Promise<LoadedContent> {
  const files = await fg(contentPatterns, {
    cwd: contentDir,
    absolute: true,
    onlyFiles: true,
  });

  const posts: Post[] = [];

  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = matter(raw);
    const relativePath = path.relative(contentDir, file);
    const { lang, type, fallbackSlug } = parseContentPath(relativePath);
    const frontmatter = normalizeFrontmatter({
      raw: parsed.data,
      rawFrontmatter: parsed.matter,
      lang,
      type,
      fallbackSlug,
      sourcePath: relativePath,
      sourceRepo: lang,
    });
    const html = renderMarkdown(parsed.content);
    const outputCollection = frontmatter.type === 'post' ? 'posts' : 'notes';
    const tags = curateTags({
      title: frontmatter.title,
      body: parsed.content,
      rawTags: frontmatter.tags,
    });

    posts.push({
      ...frontmatter,
      tags,
      body: parsed.content,
      html,
      excerpt: frontmatter.description ?? createExcerpt(html),
      inputPath: file,
      outputPath: path.join(frontmatter.lang, outputCollection, frontmatter.slug, 'index.html'),
      url: `/${frontmatter.lang}/${outputCollection}/${frontmatter.slug}/`,
    });
  }

  posts.sort((a, b) => b.date.valueOf() - a.date.valueOf());

  return {
    posts,
    byLang: {
      en: posts.filter((post) => post.lang === 'en'),
      zh: posts.filter((post) => post.lang === 'zh'),
    },
    byTag: groupByTag(posts),
  };
}

function parseContentPath(relativePath: string): { lang: Lang; type: ContentType; fallbackSlug: string } {
  const [langSegment, collection, filename] = relativePath.split(path.sep);
  const lang = assertLang(langSegment, relativePath);
  const type = collection === 'posts' ? 'post' : collection === 'notes' ? 'note' : undefined;

  if (type == null || filename == null) {
    throw new Error(`Unsupported content path: ${relativePath}`);
  }

  return {
    lang,
    type,
    fallbackSlug: path.basename(filename, path.extname(filename)),
  };
}

function assertLang(value: string | undefined, relativePath: string): Lang {
  if (value === 'en' || value === 'zh') {
    return value;
  }

  throw new Error(`Unsupported content language in path: ${relativePath}`);
}

function groupByTag(posts: Post[]): Record<Lang, Map<string, Post[]>> {
  const byTag: Record<Lang, Map<string, Post[]>> = {
    en: new Map<string, Post[]>(),
    zh: new Map<string, Post[]>(),
  };

  for (const post of posts) {
    for (const tag of post.tags) {
      const postsForTag = byTag[post.lang].get(tag) ?? [];
      byTag[post.lang].set(tag, [...postsForTag, post]);
    }
  }

  return byTag;
}
