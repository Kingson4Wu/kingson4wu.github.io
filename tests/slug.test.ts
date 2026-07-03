import { describe, expect, it } from 'vitest';
import { ensureUniqueSlug, slugFromFilename, slugifyTitle } from '../site/utils/slug.js';

describe('slug helpers', () => {
  it('keeps an existing English slug readable', () => {
    expect(slugifyTitle('Agent Runtime and Skill Convergence')).toBe('agent-runtime-and-skill-convergence');
  });

  it('uses the date prefix and sanitized title for Chinese filenames', () => {
    expect(slugFromFilename('20260331-从-Skill-化到控制权：AI-系统中的能力分层与资产保护.md')).toBe(
      '20260331-skill-ai'
    );
  });

  it('deduplicates repeated slugs deterministically', () => {
    const seen = new Set<string>(['post', 'post-2']);
    expect(ensureUniqueSlug('post', seen)).toBe('post-3');
  });
});
