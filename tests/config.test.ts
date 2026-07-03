import { describe, expect, it } from 'vitest';
import { createSiteConfig } from '../site/config.js';

describe('site config', () => {
  it('uses an explicit workspace override for default legacy directories', () => {
    const config = createSiteConfig({
      BLOG_WORKSPACE_DIR: '/tmp/workspace',
    });

    expect(config.workspaceDir).toBe('/tmp/workspace');
    expect(config.legacyEnglishDir).toBe('/tmp/workspace/kingson4wu.github.io.en');
    expect(config.legacyChineseDir).toBe('/tmp/workspace/kingson4wu.github.io.zh');
  });

  it('uses explicit legacy directory overrides when present', () => {
    const config = createSiteConfig({
      BLOG_WORKSPACE_DIR: '/tmp/workspace',
      BLOG_LEGACY_EN_DIR: '/tmp/en-blog',
      BLOG_LEGACY_ZH_DIR: '/tmp/zh-blog',
    });

    expect(config.workspaceDir).toBe('/tmp/workspace');
    expect(config.legacyEnglishDir).toBe('/tmp/en-blog');
    expect(config.legacyChineseDir).toBe('/tmp/zh-blog');
  });

  it('uses the Chinese site name in Chinese navigation context', () => {
    const config = createSiteConfig({});

    expect(config.languages.zh.title).toBe('拉巴力的纸皮箱');
  });
});
