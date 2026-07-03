import type { MigrationReport } from '../types.js';

export function formatMigrationReport(report: MigrationReport): string {
  return [
    '# Migration Report',
    '',
    `- English posts: ${report.englishPosts}`,
    `- English notes: ${report.englishNotes}`,
    `- Chinese Markdown files: ${report.chineseMarkdown}`,
    `- Total migrated: ${report.migrated}`,
    `- Duplicate slugs: ${report.duplicateSlugs.length}`,
    `- Missing images: ${report.missingImages.length}`,
    `- Warnings: ${report.warnings.length}`,
    '',
    '## Missing Images',
    '',
    ...(report.missingImages.length > 0 ? report.missingImages.map((item) => `- ${item}`) : ['None']),
    '',
    '## Duplicate Slugs',
    '',
    ...(report.duplicateSlugs.length > 0 ? report.duplicateSlugs.map((item) => `- ${item}`) : ['None']),
    '',
    '## Warnings',
    '',
    ...(report.warnings.length > 0 ? report.warnings.map((item) => `- ${item}`) : ['None']),
    '',
  ].join('\n');
}
