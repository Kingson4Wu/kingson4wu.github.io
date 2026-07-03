import path from 'node:path';
import fse from 'fs-extra';
import matter from 'gray-matter';
import { siteConfig } from './config.js';
import { checkContent } from './content/check.js';
import { loadLegacyRedirects, redirectOutputPath } from './content/legacyRedirects.js';
import { loadContent } from './content/loadContent.js';
import { renderMarkdown } from './content/markdown.js';
import type { ContentType, Lang, Post } from './types.js';
import { pathExists, resetDir, writeFileEnsured } from './utils/fs.js';
import {
  renderAboutPage,
  renderArticlePage,
  renderHomePage,
  renderListPage,
  renderRedirectPage,
  renderSearchPage,
  renderTagIndexPage,
  renderTagPage,
} from './render/pages.js';
import { renderRss } from './render/rss.js';
import { renderSearchIndex } from './render/searchIndex.js';
import { renderSitemap } from './render/sitemap.js';
import {
  renderAiProfileJson,
  renderLlmsFullTxt,
  renderLlmsTxt,
  renderMarkdownContentRoute,
  renderRobotsTxt,
} from './render/aiVisibility.js';

async function main(): Promise<void> {
  const content = await loadContent(siteConfig.contentDir);
  const result = await checkContent(content, siteConfig.contentDir);

  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`error: ${error}`);
  }

  if (result.errors.length > 0) {
    process.exit(1);
  }

  await resetDir(siteConfig.distDir);
  await copyStaticFiles();
  await renderPages(content.posts);

  console.log(`built ${content.posts.length} content items into dist/`);
}

async function copyStaticFiles(): Promise<void> {
  await fse.copy(path.join(siteConfig.rootDir, 'site', 'static'), siteConfig.distDir);
  await fse.copy(path.join(siteConfig.rootDir, 'site', 'styles'), path.join(siteConfig.distDir, 'styles'));
  await fse.copy(path.join(siteConfig.rootDir, 'site', 'scripts'), path.join(siteConfig.distDir, 'scripts'));

  for (const lang of ['en', 'zh'] satisfies Lang[]) {
    const assetDir = path.join(siteConfig.contentDir, lang, 'assets');
    if (await pathExists(assetDir)) {
      await fse.copy(assetDir, path.join(siteConfig.distDir, 'assets', lang));
    }
  }
}

async function renderPages(posts: Post[]): Promise<void> {
  const byLang = groupPostsByLang(posts);
  const extraSitemapPaths = new Set<string>();

  await writeDistFile('index.html', renderHomePage({
    lang: 'en',
    posts: byLang.en,
    canonicalPath: '/en/',
  }));

  await writeDistFile('feed.xml', renderRss('en', posts));
  await writeDistFile('search/index.html', renderRedirectPage('/en/search/'));

  for (const lang of ['en', 'zh'] satisfies Lang[]) {
    await writeDistFile(`${lang}/index.html`, renderHomePage({
      lang,
      posts: byLang[lang],
      canonicalPath: `/${lang}/`,
    }));

    for (const type of ['post', 'note'] satisfies ContentType[]) {
      const collection = type === 'post' ? 'posts' : 'notes';
      await writeDistFile(`${lang}/${collection}/index.html`, renderListPage({
        lang,
        title: collectionTitle(lang, type),
        type,
        posts: byLang[lang].filter((post) => post.type === type),
        canonicalPath: `/${lang}/${collection}/`,
      }));
    }

    await writeDistFile(`${lang}/search/index.html`, renderSearchPage({ lang }));
    extraSitemapPaths.add(`/${lang}/search/`);

    await writeDistFile(`${lang}/about/index.html`, renderAboutPage({
      lang,
      html: await loadAboutHtml(lang),
    }));
    extraSitemapPaths.add(`/${lang}/about/`);

    const tags = tagSummaries(byLang[lang]);
    await writeDistFile(`${lang}/tags/index.html`, renderTagIndexPage({ lang, tags }));
    extraSitemapPaths.add(`/${lang}/tags/`);

    for (const tag of tags) {
      const taggedPosts = byLang[lang].filter((post) => post.tags.includes(tag.name));
      await writeDistFile(`${lang}/tags/${encodeURIComponent(tag.name)}/index.html`, renderTagPage({
        lang,
        tag: tag.name,
        posts: taggedPosts,
      }));
      extraSitemapPaths.add(`/${lang}/tags/${encodeURIComponent(tag.name)}/`);
    }

    const feed = renderRss(lang, posts);
    await writeDistFile(`${lang}/feed.xml`, feed);
    await writeDistFile(`${lang}/rss.xml`, feed);
  }

  for (const publicPath of ['/llms.txt', '/llms-full.txt', '/ai-profile.json']) {
    extraSitemapPaths.add(publicPath);
  }

  const byCollection = groupPostsByCollection(posts);
  for (const post of posts) {
    const adjacentPosts = byCollection[post.lang][post.type];
    const index = adjacentPosts.findIndex((candidate) => candidate.url === post.url);
    await writeDistFile(post.outputPath, renderArticlePage({
      post,
      previous: adjacentPosts[index + 1],
      next: adjacentPosts[index - 1],
    }));
    await writeDistFile(markdownOutputPath(post), renderMarkdownContentRoute(post));
  }

  const legacyRedirects = await loadLegacyRedirects(path.join(siteConfig.contentDir, 'legacy-redirects.json'), posts);
  for (const redirect of legacyRedirects) {
    await writeDistFile(redirectOutputPath(redirect.from), renderRedirectPage(redirect.to));
  }

  await writeDistFile('sitemap.xml', renderSitemap(posts, [...extraSitemapPaths]));
  await writeDistFile('search-index.json', renderSearchIndex(posts));
  await writeDistFile('robots.txt', renderRobotsTxt());
  await writeDistFile('llms.txt', renderLlmsTxt(posts));
  await writeDistFile('llms-full.txt', renderLlmsFullTxt(posts));
  await writeDistFile('ai-profile.json', renderAiProfileJson(posts));
}

async function loadAboutHtml(lang: Lang): Promise<string> {
  const raw = await fse.readFile(path.join(siteConfig.contentDir, lang, 'about.md'), 'utf8');
  const parsed = matter(raw);
  return renderMarkdown(parsed.content);
}

function groupPostsByLang(posts: Post[]): Record<Lang, Post[]> {
  return {
    en: posts.filter((post) => post.lang === 'en'),
    zh: posts.filter((post) => post.lang === 'zh'),
  };
}

function groupPostsByCollection(posts: Post[]): Record<Lang, Record<ContentType, Post[]>> {
  return {
    en: {
      post: posts.filter((post) => post.lang === 'en' && post.type === 'post'),
      note: posts.filter((post) => post.lang === 'en' && post.type === 'note'),
    },
    zh: {
      post: posts.filter((post) => post.lang === 'zh' && post.type === 'post'),
      note: posts.filter((post) => post.lang === 'zh' && post.type === 'note'),
    },
  };
}

function collectionTitle(lang: Lang, type: ContentType): string {
  if (lang === 'zh') {
    return type === 'post' ? '文章' : '笔记';
  }

  return type === 'post' ? 'Blog' : 'Notes';
}

function tagSummaries(posts: Post[]): Array<{ name: string; count: number }> {
  const counts = new Map<string, number>();
  for (const tag of posts.flatMap((post) => post.tags)) {
    counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));
}

function markdownOutputPath(post: Post): string {
  return post.outputPath.replace(/index\.html$/, 'index.md');
}

async function writeDistFile(relativePath: string, content: string): Promise<void> {
  await writeFileEnsured(path.join(siteConfig.distDir, relativePath), content);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`error: ${message}`);
  process.exit(1);
});
