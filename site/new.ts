import { createContentDraft, parseNewContentArgs, UsageError } from './content/newContent.js';

async function main(): Promise<void> {
  const args = parseNewContentArgs(process.argv.slice(2));
  const result = await createContentDraft(args);

  console.log(`created ${result.relativePath}`);
  console.log(`url ${result.url}`);

  if (result.assetsDir && result.assetsUrlPrefix) {
    console.log(`assets ${result.assetsDir}`);
    console.log(`asset URL prefix ${result.assetsUrlPrefix}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(error instanceof UsageError ? message : `error: ${message}`);
  process.exit(error instanceof UsageError ? 0 : 1);
});
