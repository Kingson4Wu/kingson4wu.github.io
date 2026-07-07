import type { ContentType, Lang, SourceInfo } from '../types.js';

interface NormalizeInput {
  raw: Record<string, unknown>;
  rawFrontmatter?: string;
  lang: Lang;
  type: ContentType;
  fallbackSlug: string;
  sourcePath: string;
  sourceRepo: SourceInfo['repo'];
}

export interface NormalizedFrontmatter {
  title: string;
  date: Date;
  lang: Lang;
  type: ContentType;
  slug: string;
  description?: string;
  updatedDate?: Date;
  tags: string[];
  source: SourceInfo;
}

export function normalizeFrontmatter(input: NormalizeInput): NormalizedFrontmatter {
  const title = normalizeRequiredString(input.raw.title, 'title');
  const dateValue = input.raw.date ?? input.raw.pubDate;
  const dateFieldName = input.raw.date == null ? 'pubDate' : 'date';
  const rawDateScalar = extractFrontmatterScalar(input.rawFrontmatter, dateFieldName);
  const isLegacyChineseSource = input.lang === 'zh' || input.sourceRepo === 'zh';
  const date = normalizeDate(dateValue, 'date/pubDate', isLegacyChineseSource, rawDateScalar);
  const description = normalizeOptionalString(input.raw.description);
  const updatedDateValue = input.raw.updatedDate ?? input.raw.updated;
  const source = normalizeSourceInfo(input.raw.source, {
    repo: input.sourceRepo,
    path: input.sourcePath,
  });
  const slug = normalizeSlug(input.raw.slug, input.fallbackSlug);

  return {
    title,
    date,
    lang: input.lang,
    type: input.type,
    slug,
    ...(description ? { description } : {}),
    ...(updatedDateValue == null
      ? {}
      : { updatedDate: normalizeDate(updatedDateValue, 'updatedDate', isLegacyChineseSource) }),
    tags: normalizeTags(input.raw.tags),
    source,
  };
}

function normalizeRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Frontmatter field "${fieldName}" is required`);
  }

  return value.trim();
}

function normalizeOptionalString(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeSlug(value: unknown, fallbackSlug: string): string {
  const raw = value == null ? fallbackSlug : String(value);
  const slug = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!slug) {
    throw new Error('Frontmatter field "slug" must be a valid slug when provided');
  }

  return slug;
}

function normalizeTags(value: unknown): string[] {
  if (value == null) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map((tag) => String(tag).trim()).filter(Boolean);
  }

  if (typeof value === 'string') {
    return value.split(',').map((tag) => tag.trim()).filter(Boolean);
  }

  return [];
}

function normalizeSourceInfo(value: unknown, fallback: SourceInfo): SourceInfo {
  if (value == null || typeof value !== 'object') {
    return fallback;
  }

  const source = value as Partial<Record<keyof SourceInfo, unknown>>;
  const repo = source.repo;
  const sourcePath = source.path;

  if ((repo === 'root' || repo === 'en' || repo === 'zh') && typeof sourcePath === 'string' && sourcePath.trim()) {
    return {
      repo,
      path: sourcePath.trim(),
    };
  }

  return fallback;
}

function normalizeDate(
  value: unknown,
  fieldName: string,
  isLegacyChineseSource: boolean,
  rawScalar?: string,
): Date {
  if (value instanceof Date) {
    if (isLegacyChineseSource && rawScalar != null && isNoTimezoneDateTime(rawScalar)) {
      return reinterpretUtcComponentsAsChinaTime(value, fieldName);
    }

    return assertValidDate(new Date(value.getTime()), fieldName);
  }

  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`Frontmatter field "${fieldName}" is required`);
  }

  const trimmed = value.trim();
  const dateOnly = /^(\d{4})-(\d{2})-(\d{2})$/;
  const hexoDateTime = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})$/;

  if (dateOnly.test(trimmed)) {
    return assertValidDate(new Date(`${trimmed}T00:00:00.000Z`), fieldName);
  }

  const hexoMatch = trimmed.match(hexoDateTime);
  if (hexoMatch) {
    const [, year, month, day, hour, minute, second] = hexoMatch;
    return assertValidDate(new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}+08:00`), fieldName);
  }

  return assertValidDate(new Date(trimmed), fieldName);
}

function extractFrontmatterScalar(rawFrontmatter: string | undefined, fieldName: string): string | undefined {
  if (rawFrontmatter == null) {
    return undefined;
  }

  const escapedFieldName = fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = rawFrontmatter.match(new RegExp(`(?:^|\\n)\\s*${escapedFieldName}\\s*:\\s*([^\\n#]+)`));
  return match?.[1]?.trim();
}

function isNoTimezoneDateTime(value: string): boolean {
  const unquoted = value.trim().replace(/^['"]|['"]$/g, '');
  return /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}$/.test(unquoted);
}

function reinterpretUtcComponentsAsChinaTime(value: Date, fieldName: string): Date {
  const dateTime =
    `${value.getUTCFullYear()}-${padDatePart(value.getUTCMonth() + 1)}-${padDatePart(value.getUTCDate())}` +
    `T${padDatePart(value.getUTCHours())}:${padDatePart(value.getUTCMinutes())}:${padDatePart(value.getUTCSeconds())}+08:00`;

  return assertValidDate(new Date(dateTime), fieldName);
}

function padDatePart(value: number): string {
  return String(value).padStart(2, '0');
}

function assertValidDate(date: Date, fieldName: string): Date {
  if (Number.isNaN(date.getTime())) {
    throw new Error(`Frontmatter field "${fieldName}" must be a valid date`);
  }

  return date;
}
