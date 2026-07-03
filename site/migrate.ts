import path from 'node:path';
import fse from 'fs-extra';
import { siteConfig } from './config.js';
import { migrateChinese } from './migration/migrateChinese.js';
import { migrateEnglish } from './migration/migrateEnglish.js';
import { formatMigrationReport } from './migration/report.js';
import { writeFileEnsured } from './utils/fs.js';

async function main(): Promise<void> {
  await fse.ensureDir(siteConfig.contentDir);

  const english = await migrateEnglish({
    legacyDir: siteConfig.legacyEnglishDir,
    contentDir: siteConfig.contentDir,
  });
  const chinese = await migrateChinese({
    legacyDir: siteConfig.legacyChineseDir,
    contentDir: siteConfig.contentDir,
  });

  const report = formatMigrationReport({
    englishPosts: english.posts,
    englishNotes: english.notes,
    chineseMarkdown: chinese.markdown,
    migrated: english.posts + english.notes + chinese.markdown,
    missingImages: chinese.missingImages,
    duplicateSlugs: [],
    warnings: [],
  });

  await writeFileEnsured(path.join(siteConfig.rootDir, 'migration-report.md'), report);
  console.log(report);

  if (chinese.missingImages.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
