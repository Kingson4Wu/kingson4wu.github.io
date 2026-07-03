import { describe, expect, it } from 'vitest';
import { curateTags } from '../site/content/tags.js';

describe('curateTags', () => {
  it('normalizes noisy source tags into a compact display taxonomy', () => {
    const tags = curateTags({
      title: 'Skill 机制与 Agent Runtime',
      body: 'LLM agent orchestration and runtime notes.',
      rawTags: ['llm', 'SKILL', 'AI-agent', 'architecture'],
    });

    expect(tags).toEqual(['AI', 'LLM', 'Agent', 'Skill', 'Architecture']);
  });

  it('does not infer unrelated tags when source tags are already explicit', () => {
    const tags = curateTags({
      title: '《重新定义团队：谷歌如何工作》-笔记',
      body: 'The book mentions ownership, skill, architecture, and other workplace terms in passing.',
      rawTags: ['BOOK', 'JOB'],
    });

    expect(tags).toEqual(['Reading', 'Career']);
  });

  it('infers tags for untagged writing from title and body', () => {
    const tags = curateTags({
      title: 'Rust 生命周期与所有权',
      body: 'Rust lifetime annotations, ownership, and language design.',
      rawTags: [],
    });

    expect(tags).toEqual(['Rust', 'Programming Languages']);
  });

  it('drops low-signal legacy tags instead of publishing them directly', () => {
    const tags = curateTags({
      title: 'TCP 连接中的状态与 TIME_WAIT',
      body: 'A note about sockets, HTTP clients, and network reliability.',
      rawTags: ['ThreadContext', 'dead_lock', 'TIME_WAIT'],
    });

    expect(tags).toContain('Networking');
    expect(tags).not.toContain('Threadcontext');
    expect(tags).not.toContain('dead_lock');
  });
});
