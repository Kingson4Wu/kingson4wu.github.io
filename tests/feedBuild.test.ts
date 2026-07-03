import { describe, expect, it } from 'vitest';
import type { Post } from '../site/types.js';
import { renderRss } from '../site/render/rss.js';
import { renderSearchIndex } from '../site/render/searchIndex.js';
import { renderSitemap } from '../site/render/sitemap.js';

const post: Post = {
  title: 'Hello',
  date: new Date('2026-01-01T00:00:00.000Z'),
  lang: 'en',
  type: 'post',
  slug: 'hello',
  tags: ['AI'],
  body: 'Hello body',
  html: '<p>Hello body</p>',
  excerpt: 'Hello body',
  inputPath: 'content/en/posts/hello.md',
  outputPath: 'en/posts/hello/index.html',
  url: '/en/posts/hello/',
};

describe('feeds and indexes', () => {
  it('renders RSS XML', () => {
    expect(renderRss('en', [post])).toContain('<rss');
    expect(renderRss('en', [post])).toContain('Hello');
  });

  it('renders sitemap XML', () => {
    expect(renderSitemap([post])).toContain('https://kingson4wu.github.io/en/posts/hello/');
  });

  it('omits future Task 9 routes from the sitemap', () => {
    const sitemap = renderSitemap([post]);

    expect(sitemap).not.toContain('https://kingson4wu.github.io/search/');
    expect(sitemap).not.toContain('https://kingson4wu.github.io/en/tags/');
    expect(sitemap).not.toContain('https://kingson4wu.github.io/zh/tags/');
  });

  it('renders JSON search index', () => {
    const json = JSON.parse(renderSearchIndex([post]));
    expect(json[0].title).toBe('Hello');
  });

  it('escapes RSS and sitemap XML text', () => {
    const xmlPost = {
      ...post,
      title: 'Hello & <world>',
      excerpt: 'Use > and < safely',
      url: '/en/posts/hello/?a=1&b=2',
    };

    expect(renderRss('en', [xmlPost])).toContain('Hello &amp; &lt;world&gt;');
    expect(renderRss('en', [xmlPost])).toContain('Use &gt; and &lt; safely');
    expect(renderSitemap([xmlPost])).toContain('https://kingson4wu.github.io/en/posts/hello/?a=1&amp;b=2');
  });
});
