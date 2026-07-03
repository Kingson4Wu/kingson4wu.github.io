import path from 'node:path';
import fse from 'fs-extra';
import { siteConfig } from '../config.js';
import type { ContentType, Lang } from '../types.js';
import { writeFileEnsured } from '../utils/fs.js';
import { slugifyTitle } from '../utils/slug.js';

export interface NewContentArgs {
  lang: Lang;
  type: ContentType;
  title: string;
  slug?: string;
  date?: Date;
  tags: string[];
  description?: string;
  createAssetsDir?: boolean;
}

export interface CreateContentDraftOptions extends NewContentArgs {
  contentDir?: string;
}

export interface CreateContentDraftResult {
  filePath: string;
  relativePath: string;
  url: string;
  slug: string;
  assetsDir?: string;
  assetsUrlPrefix?: string;
}

const usage = `Usage:
  npm run new -- --lang zh --type post --title "文章标题" [--slug 20260703-topic] [--tags AI,Agent] [--description "摘要"] [--date 2026-07-03T14:30:00.000Z] [--assets]

Options:
  --lang zh|en          Content language.
  --type post|note      Content collection.
  --title <title>       Article title.
  --slug <slug>         Optional URL slug. Defaults to YYYYMMDD-title-slug.
  --tags <tags>         Optional comma-separated tags.
  --description <text>  Optional summary for lists and meta description.
  --date <date>         Optional ISO date. Defaults to current time.
  --assets              Create the matching asset directory.`;

const knownOptions = new Set(['lang', 'type', 'title', 'slug', 'tags', 'description', 'date', 'assets']);

export function parseNewContentArgs(argv: string[]): NewContentArgs {
  const values = new Map<string, string | boolean>();

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--help' || arg === '-h') {
      throw new UsageError(usage);
    }

    if (!arg.startsWith('--')) {
      throw new Error(`Unexpected argument: ${arg}\n\n${usage}`);
    }

    const [rawKey, inlineValue] = arg.slice(2).split(/=(.*)/s, 2);
    if (!rawKey) {
      throw new Error(`Invalid argument: ${arg}\n\n${usage}`);
    }

    if (!knownOptions.has(rawKey)) {
      throw new Error(`Unknown option: --${rawKey}\n\n${usage}`);
    }

    if (rawKey === 'assets') {
      values.set(rawKey, true);
      continue;
    }

    const value = inlineValue ?? argv[index + 1];
    if (value == null || value.startsWith('--')) {
      throw new Error(`Missing value for --${rawKey}\n\n${usage}`);
    }

    values.set(rawKey, value);
    if (inlineValue == null) {
      index += 1;
    }
  }

  const lang = parseLang(values.get('lang'));
  const type = parseContentType(values.get('type'));
  const title = parseRequiredString(values.get('title'), 'title');
  const slug = parseOptionalString(values.get('slug'));
  const description = parseOptionalString(values.get('description'));
  const date = parseOptionalDate(values.get('date'));
  const tags = parseTags(values.get('tags'));

  return {
    lang,
    type,
    title,
    ...(slug ? { slug } : {}),
    ...(date ? { date } : {}),
    tags,
    ...(description ? { description } : {}),
    ...(values.get('assets') === true ? { createAssetsDir: true } : {}),
  };
}

export async function createContentDraft(options: CreateContentDraftOptions): Promise<CreateContentDraftResult> {
  const contentDir = options.contentDir ?? siteConfig.contentDir;
  const date = options.date ?? new Date();
  const slug = normalizeSlug(options.slug ?? defaultSlug(options.title, date));
  const collection = collectionDir(options.type);
  const relativePath = toPosixPath(path.join(options.lang, collection, `${slug}.md`));
  const filePath = path.join(contentDir, relativePath);

  if (await fse.pathExists(filePath)) {
    throw new Error(`Content file already exists: ${filePath}`);
  }

  const body = serializeDraft({
    title: options.title,
    date,
    lang: options.lang,
    type: options.type,
    slug,
    tags: options.tags,
    description: options.description,
  });

  await writeFileEnsured(filePath, body);

  const result: CreateContentDraftResult = {
    filePath,
    relativePath,
    url: `/${options.lang}/${collection}/${slug}/`,
    slug,
  };

  if (options.createAssetsDir === true) {
    const assetsDir = path.join(contentDir, options.lang, 'assets', collection, slug);
    await fse.ensureDir(assetsDir);
    result.assetsDir = assetsDir;
    result.assetsUrlPrefix = `/assets/${options.lang}/${collection}/${slug}/`;
  }

  return result;
}

export function newContentUsage(): string {
  return usage;
}

export class UsageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'UsageError';
  }
}

function serializeDraft(options: Required<Pick<NewContentArgs, 'lang' | 'type' | 'title' | 'tags'>> & {
  date: Date;
  slug: string;
  description?: string;
}): string {
  const lines = [
    '---',
    `title: ${formatYamlScalar(options.title)}`,
    `date: '${options.date.toISOString()}'`,
    `lang: ${options.lang}`,
    `type: ${options.type}`,
    `slug: ${options.slug}`,
  ];

  if (options.description) {
    lines.push(`description: ${formatYamlScalar(options.description)}`);
  }

  if (options.tags.length === 0) {
    lines.push('tags: []');
  } else {
    lines.push('tags:');
    for (const tag of options.tags) {
      lines.push(`  - ${formatYamlScalar(tag)}`);
    }
  }

  lines.push('---', '', '<!-- Write the article here. -->', '');
  return lines.join('\n');
}

function defaultSlug(title: string, date: Date): string {
  const datePrefix = date.toISOString().slice(0, 10).replace(/-/g, '');
  const titleSlug = slugifyTitle(title);

  return titleSlug === 'post' ? datePrefix : `${datePrefix}-${titleSlug}`;
}

function normalizeSlug(slug: string): string {
  const normalized = slug
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalized) {
    throw new Error('Slug must contain at least one ASCII letter or number');
  }

  return normalized;
}

function collectionDir(type: ContentType): 'posts' | 'notes' {
  return type === 'post' ? 'posts' : 'notes';
}

function parseLang(value: string | boolean | undefined): Lang {
  if (value === 'zh' || value === 'en') {
    return value;
  }

  throw new Error(`--lang must be zh or en\n\n${usage}`);
}

function parseContentType(value: string | boolean | undefined): ContentType {
  if (value === 'post' || value === 'note') {
    return value;
  }

  throw new Error(`--type must be post or note\n\n${usage}`);
}

function parseRequiredString(value: string | boolean | undefined, fieldName: string): string {
  if (typeof value !== 'string' || value.trim().length === 0) {
    throw new Error(`--${fieldName} is required\n\n${usage}`);
  }

  return value.trim();
}

function parseOptionalString(value: string | boolean | undefined): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function parseOptionalDate(value: string | boolean | undefined): Date | undefined {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== 'string') {
    throw new Error(`--date must be a date string\n\n${usage}`);
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`--date must be a valid date\n\n${usage}`);
  }

  return date;
}

function parseTags(value: string | boolean | undefined): string[] {
  if (typeof value !== 'string') {
    return [];
  }

  return value
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function formatYamlScalar(value: string): string {
  const trimmed = value.trim();
  if (/^[\p{Letter}\p{Number}][\p{Letter}\p{Number} .,_/+()-]*$/u.test(trimmed) && !trimmed.includes(': ')) {
    return trimmed;
  }

  return JSON.stringify(trimmed);
}

function toPosixPath(filePath: string): string {
  return filePath.split(path.sep).join('/');
}
