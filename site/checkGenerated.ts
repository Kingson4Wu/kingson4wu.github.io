import path from 'node:path';
import { siteConfig } from './config.js';
import { auditGeneratedSite } from './eval/generatedSite.js';

const report = await auditGeneratedSite(siteConfig.distDir);
for (const item of report.errors) {
  console.error(`error: ${path.relative(siteConfig.rootDir, item.file)}:${item.line} [${item.rule}] ${item.href}`);
}
console.log(`checked ${report.pages} generated pages and ${report.links} local references: ${report.errors.length} errors`);
if (report.errors.length > 0) process.exitCode = 1;
