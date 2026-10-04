import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { evaluateClaims, type ClaimCase } from '../site/eval/claims.js';
import type { Post } from '../site/types.js';

const body = '## Boundary\n\nA valid JSON object may still contain a wrong age. [Source](https://example.org/source)\n\n## Next\n\nOther text.';
const section = '## Boundary\n\nA valid JSON object may still contain a wrong age. [Source](https://example.org/source)\n\n';
const digest = createHash('sha256').update(section).digest('hex');
const post = { inputPath: '/repo/content/en/posts/sample.md', body, slug: 'sample', lang: 'en', type: 'post' } as Post;
const claim: ClaimCase = {
  id: 'json-is-not-truth',
  path: 'content/en/posts/sample.md',
  heading: 'Boundary',
  anchor: 'A valid JSON object may still contain a wrong age.',
  expectation: 'Schema validity does not establish factual accuracy.',
  boundary: 'Do not imply all valid JSON is correct.',
  sources: ['https://example.org/source'],
  sourceLocators: ['Section 2, schema validation limits'],
  reviewedAt: '2026-10-03',
  sectionDigest: digest,
};

describe('evaluateClaims', () => {
  it('accepts a bound source section with its cited evidence', () => {
    expect(evaluateClaims([post], [claim], '/repo')).toEqual([]);
  });

  it('allows an explicitly bound bibliography while keeping the claim section checked', () => {
    const prose = '## Boundary\n\nA valid JSON object may still contain a wrong age.\n\n';
    const bibliography = '\n## References\n\n[Source](https://example.org/source)';
    const revised = { ...post, body: prose + '## Next\n\nOther text.' + bibliography };
    const bound = { ...claim, sourceHeading: 'References', sectionDigest: createHash('sha256').update(prose).digest('hex') };
    expect(evaluateClaims([revised], [bound], '/repo')).toEqual([]);
    expect(evaluateClaims([revised], [{ ...bound, sourceHeading: undefined }], '/repo'))
      .toContainEqual(expect.objectContaining({ rule: 'claim-source' }));
    expect(evaluateClaims([{ ...revised, body: revised.body.replace('https://example.org/source', 'https://other.org') }], [bound], '/repo'))
      .toContainEqual(expect.objectContaining({ rule: 'claim-source' }));
    expect(evaluateClaims([{ ...revised, body: revised.body.replace('wrong age.', 'wrong answer.') }], [bound], '/repo'))
      .toContainEqual(expect.objectContaining({ rule: 'claim-section-changed' }));
  });

  it('rejects a nonexistent source heading', () => {
    expect(evaluateClaims([post], [{ ...claim, sourceHeading: 'Missing references' }], '/repo'))
      .toContainEqual(expect.objectContaining({ rule: 'claim-source-heading' }));
  });

  it('flags a changed section even when the anchor remains', () => {
    const changed = { ...post, body: body.replace('[Source]', '[Official source]') };
    expect(evaluateClaims([changed], [claim], '/repo')).toContainEqual(expect.objectContaining({ rule: 'claim-section-changed', line: 1 }));
  });

  it('flags a missing anchor and missing cited source', () => {
    const changed = { ...post, body: body.replace('A valid JSON object may still contain a wrong age.', 'The answer can be wrong.').replace('https://example.org/source', 'https://other.org') };
    const rules = evaluateClaims([changed], [claim], '/repo').map((item) => item.rule);
    expect(rules).toContain('claim-anchor');
    expect(rules).toContain('claim-source');
  });

  it('rejects duplicate case ids', () => {
    expect(evaluateClaims([post], [claim, claim], '/repo').map((item) => item.rule)).toContain('claim-duplicate-id');
  });

  it('reports malformed cases instead of crashing or accepting non-string claims', () => {
    const malformed = [null, { ...claim, id: 'bad', expectation: 42, sources: [42] }];
    expect(evaluateClaims([post], malformed as unknown as ClaimCase[], '/repo').map((item) => item.rule))
      .toEqual(['claim-schema', 'claim-schema']);
  });

  it('requires dated source review and a locator for every source', () => {
    const malformed = [
      { ...claim, reviewedAt: undefined },
      { ...claim, sourceLocators: [] },
      { ...claim, sourceLocators: [''] },
      { ...claim, reviewedAt: '2026-99-99' },
    ];
    expect(evaluateClaims([post], malformed as unknown as ClaimCase[], '/repo').map((item) => item.rule))
      .toEqual(['claim-schema', 'claim-schema', 'claim-schema', 'claim-schema']);
  });

  it('warns when a time-sensitive claim reaches its review deadline', () => {
    const due = { ...claim, reviewedAt: '2026-09-03', reviewBy: '2026-10-03' };
    expect(evaluateClaims([post], [due], '/repo', '2026-10-04'))
      .toContainEqual(expect.objectContaining({ rule: 'claim-review-due', severity: 'warning' }));
  });
});
