import { describe, expect, it } from 'vitest';
import type { Post } from '../site/types.js';
import {
  renderAiProfileJson,
  renderLlmsFullTxt,
  renderLlmsTxt,
  renderMarkdownContentRoute,
  renderRobotsTxt,
} from '../site/render/aiVisibility.js';

const posts: Post[] = [
  {
    title: 'Transformer 架构笔记',
    date: new Date('2026-02-02T00:00:00.000Z'),
    lang: 'zh',
    type: 'post',
    slug: '20260202-transformer',
    tags: ['AI', 'LLM'],
    body: '正文内容\n\n## Attention',
    html: '<p>正文内容</p>',
    excerpt: 'Transformer architecture notes.',
    inputPath: 'content/zh/posts/20260202-transformer.md',
    outputPath: 'zh/posts/20260202-transformer/index.html',
    url: '/zh/posts/20260202-transformer/',
  },
  {
    title: 'Agent Runtime and Skill Convergence',
    date: new Date('2026-03-28T00:00:00.000Z'),
    lang: 'en',
    type: 'post',
    slug: 'agent-runtime-and-skill-convergence',
    tags: ['AI', 'Agent', 'Skill'],
    body: 'English body',
    html: '<p>English body</p>',
    excerpt: 'A note on runtime boundaries.',
    inputPath: 'content/en/posts/agent-runtime-and-skill-convergence.md',
    outputPath: 'en/posts/agent-runtime-and-skill-convergence/index.html',
    url: '/en/posts/agent-runtime-and-skill-convergence/',
  },
];

describe('AI visibility renderers', () => {
  it('renders robots.txt with search crawlers allowed and training crawlers blocked', () => {
    const robots = renderRobotsTxt();

    expect(robots).toContain('User-agent: OAI-SearchBot\nAllow: /');
    expect(robots).toContain('User-agent: ChatGPT-User\nAllow: /');
    expect(robots).toContain('User-agent: GPTBot\nDisallow: /');
    expect(robots).toContain('User-agent: ClaudeBot\nDisallow: /');
    expect(robots).toContain('Sitemap: https://kingson4wu.github.io/sitemap.xml');
  });

  it('renders llms.txt with concise site context and machine-readable links', () => {
    const llms = renderLlmsTxt(posts);

    expect(llms).toContain('# Kingson Wu / 拉巴力的纸皮箱');
    expect(llms).toContain('https://kingson4wu.github.io/llms-full.txt');
    expect(llms).toContain('https://kingson4wu.github.io/ai-profile.json');
    expect(llms).toContain('[Transformer 架构笔记](https://kingson4wu.github.io/zh/posts/20260202-transformer/)');
  });

  it('renders llms-full.txt with all canonical and markdown content links', () => {
    const full = renderLlmsFullTxt(posts);

    expect(full).toContain('## Content Index');
    expect(full).toContain('HTML: https://kingson4wu.github.io/en/posts/agent-runtime-and-skill-convergence/');
    expect(full).toContain('Markdown: https://kingson4wu.github.io/en/posts/agent-runtime-and-skill-convergence/index.md');
    expect(full).toContain('Tags: AI, Agent, Skill');
  });

  it('renders structured JSON profile data for AI tools', () => {
    const profile = JSON.parse(renderAiProfileJson(posts));

    expect(profile.site.url).toBe('https://kingson4wu.github.io');
    expect(profile.content.counts.total).toBe(2);
    expect(profile.content.latest[0].title).toBe('Agent Runtime and Skill Convergence');
    expect(profile.content.latest[0].markdownUrl).toBe(
      'https://kingson4wu.github.io/en/posts/agent-runtime-and-skill-convergence/index.md',
    );
  });

  it('renders a markdown route with metadata and original body', () => {
    const markdown = renderMarkdownContentRoute(posts[0]);

    expect(markdown).toContain('# Transformer 架构笔记');
    expect(markdown).toContain('Canonical: https://kingson4wu.github.io/zh/posts/20260202-transformer/');
    expect(markdown).toContain('Markdown: https://kingson4wu.github.io/zh/posts/20260202-transformer/index.md');
    expect(markdown).toContain('正文内容');
  });
});
