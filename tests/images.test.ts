import { describe, expect, it } from 'vitest';
import { rewriteMarkdownImagePaths } from '../site/migration/images.js';

describe('rewriteMarkdownImagePaths', () => {
  it('rewrites local Markdown and HTML image paths while preserving remote URLs', () => {
    const input = [
      '![](diagram.png)',
      '![Shared](photo/Zidane.jpeg)',
      '![Remote](https://example.com/image.png)',
      '<img src="inline.png" alt="inline">',
    ].join('\n');

    const result = rewriteMarkdownImagePaths(input, {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toContain('![](/assets/zh/posts/sample-post/diagram.png)');
    expect(result.markdown).toContain('![Shared](/assets/zh/shared/photo/Zidane.jpeg)');
    expect(result.markdown).toContain('![Remote](https://example.com/image.png)');
    expect(result.markdown).toContain('<img src="/assets/zh/posts/sample-post/inline.png" alt="inline">');
    expect(result.references).toEqual(['diagram.png', 'photo/Zidane.jpeg', 'inline.png']);
  });

  it('rewrites Markdown image paths containing parentheses', () => {
    const result = rewriteMarkdownImagePaths('![x](images/foo (1).png)', {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toBe('![x](/assets/zh/posts/sample-post/images/foo%20(1).png)');
    expect(result.references).toEqual(['images/foo (1).png']);
  });

  it('URL-encodes public Markdown image paths while preserving original references', () => {
    const result = rewriteMarkdownImagePaths('![](identify protocol.png)', {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toBe('![](/assets/zh/posts/sample-post/identify%20protocol.png)');
    expect(result.references).toEqual(['identify protocol.png']);
  });

  it('rewrites Markdown image paths while preserving optional titles', () => {
    const result = rewriteMarkdownImagePaths('![x](diagram.png "Architecture")', {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toBe('![x](/assets/zh/posts/sample-post/diagram.png "Architecture")');
    expect(result.references).toEqual(['diagram.png']);
  });

  it('rewrites Markdown image paths while preserving parenthesized titles', () => {
    const result = rewriteMarkdownImagePaths('![x](diagram.png (Architecture))', {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toBe('![x](/assets/zh/posts/sample-post/diagram.png (Architecture))');
    expect(result.references).toEqual(['diagram.png']);
  });

  it('rewrites uppercase HTML image tags and src attributes', () => {
    const result = rewriteMarkdownImagePaths('<IMG SRC="inline.png" ALT="x">', {
      lang: 'zh',
      type: 'post',
      slug: 'sample-post',
    });

    expect(result.markdown).toBe('<IMG SRC="/assets/zh/posts/sample-post/inline.png" ALT="x">');
    expect(result.references).toEqual(['inline.png']);
  });
});
