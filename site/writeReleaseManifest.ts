import fs from 'node:fs/promises';
import path from 'node:path';
import { siteConfig } from './config.js';
import { loadContent } from './content/loadContent.js';
import { browserRoutes } from './eval/browserRoutes.js';
import { createReleaseManifest } from './eval/releaseManifest.js';

const changedFiles: string[] = [];
let commit = '';
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index += 1) {
  const option = args[index];
  const value = args[++index];
  if (!value || value.startsWith('--')) throw new Error(`${option} needs a value`);
  if (option === '--commit') commit = value;
  else if (option === '--changed-file') changedFiles.push(value);
  else throw new Error(`Unknown release manifest option: ${option}`);
}

const content = await loadContent(siteConfig.contentDir);
const routes = ['/', ...browserRoutes(content.posts, changedFiles), '/styles/main.css'];
const manifest = await createReleaseManifest(siteConfig.distDir, commit, routes);
const destination = path.join(siteConfig.distDir, 'release-manifest.json');
await fs.writeFile(destination, `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`recorded ${manifest.pages.length} verified release paths for ${commit}`);
