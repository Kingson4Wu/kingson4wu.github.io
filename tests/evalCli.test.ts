import { describe, expect, it } from 'vitest';
import { formatGithubAnnotation, parseEvalArgs } from '../site/eval.js';

describe('parseEvalArgs', () => {
  it('keeps an explicitly empty changed set distinct from a full audit', () => {
    expect(parseEvalArgs(['--changed-only']).changed).toEqual([]);
    expect(parseEvalArgs(['--all']).changed).toBeUndefined();
  });

  it('marks new files even when also listed as changed', () => {
    expect(parseEvalArgs(['--changed-only', '--changed-file', 'content/zh/posts/a.md', '--new-file', 'content/zh/posts/a.md']).changed)
      .toEqual([{ path: 'content/zh/posts/a.md', isNew: true }]);
  });

  it('rejects unknown options', () => {
    expect(() => parseEvalArgs(['--surprise'])).toThrow('Unknown option');
  });

  it('accepts a baseline Git revision for route stability checks', () => {
    expect(parseEvalArgs(['--changed-only', '--base-ref', 'abc123']).baseRef).toBe('abc123');
    expect(() => parseEvalArgs(['--base-ref'])).toThrow('--base-ref needs a Git revision');
  });

  it('formats source diagnostics as GitHub Actions annotations', () => {
    expect(formatGithubAnnotation({
      file: '/repo/content/zh/posts/test.md', line: 12, rule: 'internal-link',
      severity: 'error', message: 'Missing target: /zh/posts/old/',
    }, '/repo')).toBe('::error file=content/zh/posts/test.md,line=12,title=internal-link::Missing target: /zh/posts/old/');
  });
});
