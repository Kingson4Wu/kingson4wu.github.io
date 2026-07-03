import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Lang } from './types.js';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

type ConfigEnv = Partial<Record<'BLOG_WORKSPACE_DIR' | 'BLOG_LEGACY_EN_DIR' | 'BLOG_LEGACY_ZH_DIR', string>>;

export function createSiteConfig(env: ConfigEnv = process.env) {
  const workspaceDir = env.BLOG_WORKSPACE_DIR ?? path.resolve(rootDir, '..');

  return {
    rootDir,
    workspaceDir,
    siteUrl: 'https://kingson4wu.github.io',
    distDir: path.join(rootDir, 'dist'),
    contentDir: path.join(rootDir, 'content'),
    legacyEnglishDir: env.BLOG_LEGACY_EN_DIR ?? path.join(workspaceDir, 'kingson4wu.github.io.en'),
    legacyChineseDir: env.BLOG_LEGACY_ZH_DIR ?? path.join(workspaceDir, 'kingson4wu.github.io.zh'),
    languages: {
      en: {
        label: 'English',
        switchLabel: '中文',
        switchHref: '/zh/',
        title: 'Kingson Wu',
        description: 'Technical writing on software, AI systems, architecture, and learning.',
        nav: [
          ['Blog', '/en/posts/'],
          ['Notes', '/en/notes/'],
          ['Tags', '/en/tags/'],
          ['About', '/en/about/'],
          ['Search', '/en/search/'],
        ],
      },
      zh: {
        label: '中文',
        switchLabel: 'English',
        switchHref: '/en/',
        title: '拉巴力的纸皮箱',
        description: '技术、AI 系统、软件架构与学习笔记。',
        nav: [
          ['文章', '/zh/posts/'],
          ['笔记', '/zh/notes/'],
          ['标签', '/zh/tags/'],
          ['关于', '/zh/about/'],
          ['搜索', '/zh/search/'],
        ],
      },
    } satisfies Record<Lang, {
      label: string;
      switchLabel: string;
      switchHref: string;
      title: string;
      description: string;
      nav: Array<[string, string]>;
    }>,
  };
}

export const siteConfig = createSiteConfig();
