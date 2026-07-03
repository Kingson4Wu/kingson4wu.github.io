import { describe, expect, it } from 'vitest';
import { renderRedirectPage } from '../site/render/pages.js';

describe('redirect pages', () => {
  it('renders meta refresh redirect pages', () => {
    const html = renderRedirectPage('/zh/posts/example/');
    expect(html).toContain('refresh');
    expect(html).toContain('/zh/posts/example/');
  });
});
