export type Lang = 'en' | 'zh';
export type ContentType = 'post' | 'note';

export interface SourceInfo {
  repo: 'root' | 'en' | 'zh';
  path: string;
}

export interface Post {
  title: string;
  date: Date;
  lang: Lang;
  type: ContentType;
  slug: string;
  description?: string;
  updatedDate?: Date;
  tags: string[];
  source?: SourceInfo;
  body: string;
  html: string;
  excerpt: string;
  inputPath: string;
  outputPath: string;
  url: string;
}

export interface Redirect {
  from: string;
  to: string;
}

export interface MigrationReport {
  englishPosts: number;
  englishNotes: number;
  chineseMarkdown: number;
  migrated: number;
  missingImages: string[];
  duplicateSlugs: string[];
  warnings: string[];
}
