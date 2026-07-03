import { describe, expect, it } from 'vitest';
import type { Post } from '../site/types.js';
import {
  renderAboutPage,
  renderArticlePage,
  renderHomePage,
  renderListPage,
  renderSearchPage,
  renderTagIndexPage,
  renderTagPage,
} from '../site/render/pages.js';

const post: Post = {
  title: 'Hello',
  date: new Date('2026-01-01T00:00:00.000Z'),
  lang: 'en',
  type: 'post',
  slug: 'hello',
  tags: ['AI'],
  body: 'Hello',
  html: '<p>Hello</p>',
  excerpt: 'Hello',
  inputPath: 'content/en/posts/hello.md',
  outputPath: 'en/posts/hello/index.html',
  url: '/en/posts/hello/',
};

const note: Post = {
  ...post,
  title: 'Tiny note',
  type: 'note',
  slug: 'tiny-note',
  html: '<p>Full note body</p><p>Second paragraph</p>',
  excerpt: 'Short excerpt',
  outputPath: 'en/notes/tiny-note/index.html',
  url: '/en/notes/tiny-note/',
};

describe('page rendering', () => {
  it('renders homepage with navigation and latest posts', () => {
    const html = renderHomePage({ lang: 'en', posts: [post], canonicalPath: '/en/' });
    expect(html).toContain('Kingson Wu');
    expect(html).toContain('Hello');
    expect(html).toContain('/zh/');
    expect(html).toContain('Write clearly');
    expect(html).toContain('type="application/rss+xml"');
    expect(html).toContain('/en/feed.xml');
    expect(html).toContain('/vendor/katex/katex.min.css');
    expect(html).toContain('class="feed-link"');
    expect(html).toContain('data-reading-return');
    expect(html).toContain('/scripts/reading-tools.js');
    expect(html).not.toContain('<h1>Kingson Wu</h1>');
  });

  it('renders article page with body and tags', () => {
    const html = renderArticlePage({
      post: {
        ...post,
        html: '<h2 id="start" data-heading-text="Start">Start</h2><p>Hello</p><h3 id="w-o" data-heading-text="W_O 的关键作用"><span class="math math-inline"><span class="katex">WOW_OWO</span></span> 的关键作用</h3>',
      },
      previous: undefined,
      next: undefined,
    });
    expect(html).toContain('<article');
    expect(html).toContain('<p>Hello</p>');
    expect(html).toContain('AI');
    expect(html).toContain('twitter.com/intent/tweet');
    expect(html).toContain('data-comments');
    expect(html).toContain('data-comments-repo="Kingson4Wu/kingson4wu.github.io"');
    expect(html).toContain('data-article-toc');
    expect(html).toContain('href="#start"');
    expect(html).toContain('href="#w-o"');
    expect(html).toContain('>W_O 的关键作用</a>');
    expect(html).not.toContain('>WOW_OWO 的关键作用</a>');
    expect(html).toContain('/scripts/article-toc.js');
    expect(html).toContain('<link rel="alternate" type="text/markdown" href="/en/posts/hello/index.md">');
  });

  it('does not render the article table of contents for notes', () => {
    const html = renderArticlePage({
      post: {
        ...note,
        html: '<h2 id="note-heading">Note heading</h2><p>Full note body</p>',
      },
      previous: undefined,
      next: undefined,
    });

    expect(html).not.toContain('data-article-toc');
    expect(html).not.toContain('/scripts/article-toc.js');
  });

  it('escapes post titles in lists and article headings', () => {
    const unsafePost = { ...post, title: 'Hello <script>alert("x")</script>' };

    const homeHtml = renderHomePage({ lang: 'en', posts: [unsafePost], canonicalPath: '/en/' });
    const articleHtml = renderArticlePage({ post: unsafePost, previous: undefined, next: undefined });

    expect(homeHtml).toContain('Hello &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(articleHtml).toContain('Hello &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    expect(homeHtml).not.toContain('<script>alert("x")</script>');
    expect(articleHtml).not.toContain('<script>alert("x")</script>');
  });

  it('renders language-specific search page controls', () => {
    const html = renderSearchPage({ lang: 'zh' });

    expect(html).toContain('data-search-input');
    expect(html).toContain('data-search-results');
    expect(html).toContain('data-search-lang');
    expect(html).toContain('data-search-lang="zh"');
    expect(html).not.toContain('<option value="">All</option>');
    expect(html).toContain('/scripts/search.js');
  });

  it('renders note lists with full note bodies', () => {
    const html = renderListPage({
      lang: 'en',
      title: 'Notes',
      type: 'note',
      posts: [note],
      canonicalPath: '/en/notes/',
    });

    expect(html).toContain('<p>Full note body</p>');
    expect(html).toContain('<p>Second paragraph</p>');
    expect(html).not.toContain('Short excerpt</p>');
  });

  it('renders about page with trusted prose html', () => {
    const html = renderAboutPage({ lang: 'en', html: '<p>About <strong>me</strong>.</p>' });

    expect(html).toContain('<h1>About</h1>');
    expect(html).toContain('<p>About <strong>me</strong>.</p>');
  });

  it('renders escaped tag index links', () => {
    const html = renderTagIndexPage({
      lang: 'en',
      tags: [
        { name: 'AI', count: 3 },
        { name: '<unsafe>', count: 1 },
      ],
    });

    expect(html).toContain('/en/tags/AI/');
    expect(html).toContain('&lt;unsafe&gt;');
    expect(html).toContain('/en/tags/%3Cunsafe%3E/');
    expect(html).toContain('AI <span>3</span>');
  });

  it('renders tag detail pages with escaped tag labels and matching posts', () => {
    const html = renderTagPage({ lang: 'en', tag: '<unsafe>', posts: [{ ...post, tags: ['<unsafe>'] }] });

    expect(html).toContain('Tag: &lt;unsafe&gt;');
    expect(html).toContain('Hello');
    expect(html).not.toContain('Tag: <unsafe>');
  });
});
