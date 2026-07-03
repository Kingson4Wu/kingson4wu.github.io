import matter from 'gray-matter';
import { describe, expect, it } from 'vitest';
import { normalizeFrontmatter } from '../site/content/frontmatter.js';

describe('normalizeFrontmatter', () => {
  it('normalizes Hexo-style Chinese metadata', () => {
    const result = normalizeFrontmatter({
      raw: {
        title: '分布式限流简单总结',
        date: '2020-07-11 23:01:37',
        tags: ['限流'],
      },
      lang: 'zh',
      type: 'post',
      fallbackSlug: '20200711-post',
      sourcePath: 'source/_posts/20200711-分布式限流简单总结.md',
      sourceRepo: 'zh',
    });

    expect(result.title).toBe('分布式限流简单总结');
    expect(result.lang).toBe('zh');
    expect(result.type).toBe('post');
    expect(result.slug).toBe('20200711-post');
    expect(result.tags).toEqual(['限流']);
    expect(result.date.toISOString()).toBe('2020-07-11T15:01:37.000Z');
  });

  it('normalizes Astro-style English metadata', () => {
    const result = normalizeFrontmatter({
      raw: {
        title: 'Agent Runtime',
        description: 'A short description',
        pubDate: '2026-03-28',
        tags: ['AI'],
      },
      lang: 'en',
      type: 'post',
      fallbackSlug: 'agent-runtime',
      sourcePath: 'src/content/blog/agent-runtime.md',
      sourceRepo: 'en',
    });

    expect(result.description).toBe('A short description');
    expect(result.tags).toEqual(['AI']);
    expect(Number.isNaN(result.date.getTime())).toBe(false);
  });

  it('preserves migrated source metadata when present', () => {
    const result = normalizeFrontmatter({
      raw: {
        title: '分布式限流简单总结',
        date: '2020-07-11 23:01:37',
        source: {
          repo: 'zh',
          path: 'source/_posts/20200711-分布式限流简单总结.md',
        },
      },
      lang: 'zh',
      type: 'post',
      fallbackSlug: '20200711-post',
      sourcePath: 'zh/posts/20200711-post.md',
      sourceRepo: 'zh',
    });

    expect(result.source).toEqual({
      repo: 'zh',
      path: 'source/_posts/20200711-分布式限流简单总结.md',
    });
  });

  it('preserves gray-matter parsed legacy Chinese post datetime as +08:00 local time', () => {
    const result = normalizeParsedChineseDate('2020-07-11 23:01:37');

    expect(result.date.toISOString()).toBe('2020-07-11T15:01:37.000Z');
  });

  it('preserves gray-matter parsed Chinese timezone datetime instant', () => {
    const result = normalizeParsedChineseDate('2020-07-11T23:01:37+08:00');

    expect(result.date.toISOString()).toBe('2020-07-11T15:01:37.000Z');
  });

  it('preserves gray-matter parsed Chinese ISO UTC datetime instant', () => {
    const result = normalizeParsedChineseDate('2020-07-11T15:01:37.000Z');

    expect(result.date.toISOString()).toBe('2020-07-11T15:01:37.000Z');
  });

  it('preserves gray-matter parsed Chinese date-only UTC midnight', () => {
    const result = normalizeParsedChineseDate('2020-07-11');

    expect(result.date.toISOString()).toBe('2020-07-11T00:00:00.000Z');
  });

  it('preserves parsed Date when raw scalar is unavailable', () => {
    const result = normalizeFrontmatter({
      raw: {
        title: 'Legacy parsed date',
        date: new Date('2020-07-11T23:01:37.000Z'),
      },
      lang: 'zh',
      type: 'post',
      fallbackSlug: 'legacy-parsed-date',
      sourcePath: 'source/_posts/legacy-parsed-date.md',
      sourceRepo: 'zh',
    });

    expect(result.date.toISOString()).toBe('2020-07-11T23:01:37.000Z');
  });
});

function normalizeParsedChineseDate(dateScalar: string) {
  const parsed = matter(`---
title: 分布式限流简单总结
date: ${dateScalar}
tags: [限流]
---

body
`);

  return normalizeFrontmatter({
    raw: parsed.data,
    rawFrontmatter: parsed.matter,
    lang: 'zh',
    type: 'post',
    fallbackSlug: '20200711-post',
    sourcePath: 'source/_posts/20200711-分布式限流简单总结.md',
    sourceRepo: 'zh',
  });
}
