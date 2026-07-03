import { siteConfig } from './config.js';
import { checkContent } from './content/check.js';
import { loadContent } from './content/loadContent.js';

async function main(): Promise<void> {
  const content = await loadContent(siteConfig.contentDir);
  const result = await checkContent(content, siteConfig.contentDir);

  for (const warning of result.warnings) {
    console.warn(`warning: ${warning}`);
  }

  for (const error of result.errors) {
    console.error(`error: ${error}`);
  }

  console.log(`checked ${content.posts.length} content items`);

  if (result.errors.length > 0) {
    process.exit(1);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`error: ${message}`);
  process.exit(1);
});
