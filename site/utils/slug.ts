const stopWords = new Set(['or', 'the', 'a', 'an', 'of', 'to', 'from', 'in', 'on', 'with']);

export function slugifyTitle(value: string): string {
  const ascii = value
    .normalize('NFKD')
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

  const tokens = ascii
    .split('-')
    .filter((token) => token && /^[a-z0-9]+$/.test(token))
    .filter((token) => !stopWords.has(token));

  return tokens.join('-') || 'post';
}

export function slugFromFilename(filename: string): string {
  const basename = filename.replace(/\.(md|mdx)$/i, '');
  const match = basename.match(/^(\d{8})-(.+)$/);
  if (!match) {
    return slugifyTitle(basename);
  }

  const [, date, title] = match;
  const titleSlug = slugifyTitle(title);
  return titleSlug === 'post' ? date : `${date}-${titleSlug}`.replace(/-+/g, '-');
}

export function ensureUniqueSlug(slug: string, seen: Set<string>): string {
  if (!seen.has(slug)) {
    seen.add(slug);
    return slug;
  }

  let index = 2;
  while (seen.has(`${slug}-${index}`)) {
    index += 1;
  }

  const unique = `${slug}-${index}`;
  seen.add(unique);
  return unique;
}
