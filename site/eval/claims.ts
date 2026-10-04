import { createHash } from 'node:crypto';
import path from 'node:path';
import type { Post } from '../types.js';
import type { Diagnostic } from './contentEval.js';

export interface ClaimCase {
  id: string;
  path: string;
  heading: string;
  sourceHeading?: string;
  anchor: string;
  expectation: string;
  boundary: string;
  sources: string[];
  sourceLocators: string[];
  reviewedAt: string;
  reviewBy?: string;
  sectionDigest: string;
}

const headingPattern = /^(#{1,6})[ \t]+(.+?)[ \t]*$/gm;

export function sectionDigest(section: string): string {
  return createHash('sha256').update(section).digest('hex');
}

export function evaluateClaims(posts: Post[], cases: ClaimCase[], root: string, asOf = new Date().toISOString().slice(0, 10)): Diagnostic[] {
  const byPath = new Map(posts.map((post) => [path.resolve(post.inputPath), post]));
  const seen = new Set<string>();
  const diagnostics: Diagnostic[] = [];
  for (const raw of cases) {
    const item: unknown = raw;
    const record = item != null && typeof item === 'object' ? item as Partial<ClaimCase> : {};
    const file = path.resolve(root, typeof record.path === 'string' ? record.path : 'evals/claims.json');
    const report = (rule: string, message: string, line = 1) => diagnostics.push({ file, line, rule, severity: 'error' as const, message: `${typeof record.id === 'string' ? record.id : '<missing id>'}: ${message}` });
    if (!isClaimCase(item)) {
      report('claim-schema', 'Case needs id, path, heading, anchor, expectation, boundary, sources, sourceLocators, reviewedAt and sectionDigest');
      continue;
    }
    if (seen.has(item.id)) report('claim-duplicate-id', 'Duplicate case id');
    seen.add(item.id);
    const post = byPath.get(file);
    if (post == null) {
      report('claim-article', 'Source article does not exist');
      continue;
    }
    const section = findSection(post.body, item.heading);
    if (section == null) {
      report('claim-heading', `Heading does not exist: ${item.heading}`);
      continue;
    }
    const line = (post.body.slice(0, section.start).match(/\n/g) ?? []).length + 1;
    if (!section.text.includes(item.anchor)) report('claim-anchor', 'Anchor text is absent from the named section', line);
    const sourceSection = item.sourceHeading == null ? section : findSection(post.body, item.sourceHeading);
    if (sourceSection == null) report('claim-source-heading', `Source heading does not exist: ${item.sourceHeading}`, line);
    for (const source of item.sources) {
      if (!/^https?:\/\//.test(source) || !sourceSection?.text.includes(source)) {
        report('claim-source', `Cited source is absent from the source section: ${source}`, line);
      }
    }
    if (sectionDigest(section.text) !== item.sectionDigest) {
      report('claim-section-changed', 'Section changed; review the claim, boundary and sources before updating its digest', line);
    }
    if (item.reviewBy && item.reviewBy <= asOf) {
      diagnostics.push({ file, line, rule: 'claim-review-due', severity: 'warning', message: `${item.id}: Review time-sensitive sources and update the review date and deadline` });
    }
  }
  return diagnostics;
}

function isClaimCase(value: unknown): value is ClaimCase {
  if (value == null || typeof value !== 'object') return false;
  const item = value as Partial<ClaimCase>;
  const textFields = [item.id, item.path, item.heading, item.anchor, item.expectation, item.boundary];
  return textFields.every((field) => typeof field === 'string' && field.trim().length > 0)
    && Array.isArray(item.sources)
    && item.sources.length > 0
    && item.sources.every((source) => typeof source === 'string' && /^https?:\/\/\S+$/.test(source))
    && Array.isArray(item.sourceLocators)
    && item.sourceLocators.length === item.sources.length
    && item.sourceLocators.every((locator) => typeof locator === 'string' && locator.trim().length > 0)
    && typeof item.reviewedAt === 'string'
    && /^\d{4}-\d{2}-\d{2}$/.test(item.reviewedAt)
    && !Number.isNaN(Date.parse(item.reviewedAt))
    && new Date(item.reviewedAt).toISOString().slice(0, 10) === item.reviewedAt
    && (item.reviewBy == null || (typeof item.reviewBy === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(item.reviewBy)
      && !Number.isNaN(Date.parse(item.reviewBy)) && new Date(item.reviewBy).toISOString().slice(0, 10) === item.reviewBy
      && item.reviewBy > item.reviewedAt))
    && typeof item.sectionDigest === 'string'
    && (item.sourceHeading == null || (typeof item.sourceHeading === 'string' && item.sourceHeading.trim().length > 0))
    && /^[a-f0-9]{64}$/.test(item.sectionDigest);
}

function findSection(body: string, heading: string): { start: number; text: string } | undefined {
  const matches = [...body.matchAll(headingPattern)];
  const index = matches.findIndex((match) => match[2].trim() === heading);
  if (index < 0) return undefined;
  const current = matches[index];
  const level = current[1].length;
  const next = matches.slice(index + 1).find((match) => match[1].length <= level);
  const start = current.index ?? 0;
  return { start, text: body.slice(start, next?.index ?? body.length) };
}
