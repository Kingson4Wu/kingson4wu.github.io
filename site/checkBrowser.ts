import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';
import { siteConfig } from './config.js';
import { loadContent } from './content/loadContent.js';
import { browserRoutes } from './eval/browserRoutes.js';
import { evaluateVisualLayout } from './eval/visualLayout.js';

const contentTypes: Record<string, string> = {
  '.css': 'text/css', '.html': 'text/html', '.js': 'application/javascript',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.xml': 'application/xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.woff2': 'font/woff2',
};

const server = http.createServer(async (request, response) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
  const relative = pathname.endsWith('/') ? `${pathname.slice(1)}index.html` : pathname.slice(1);
  let decoded: string;
  try { decoded = decodeURIComponent(relative); } catch { response.writeHead(400); response.end('Bad URL'); return; }
  const file = path.resolve(siteConfig.distDir, decoded);
  if (file.startsWith(`${siteConfig.distDir}${path.sep}`)) {
    try {
      const body = await fs.readFile(file);
      response.writeHead(200, { 'content-type': contentTypes[path.extname(file)] ?? 'application/octet-stream' });
      response.end(body);
      return;
    } catch { /* Missing file. */ }
  }
  response.writeHead(404);
  response.end('Not found');
});

await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
if (address == null || typeof address === 'string') throw new Error('Could not start local site server');
const origin = `http://127.0.0.1:${address.port}`;
let browser;
try {
  const content = await loadContent(siteConfig.contentDir);
  const changedFiles: string[] = [];
  const args = process.argv.slice(2);
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg !== '--changed-file') throw new Error(`Unknown browser check option: ${arg}`);
    const file = args[++index];
    if (!file || file.startsWith('--')) throw new Error('--changed-file needs a path');
    changedFiles.push(file);
  }
  const routes = browserRoutes(content.posts, changedFiles);
  const screenshotDir = process.env.BLOG_BROWSER_SCREENSHOTS;
  if (screenshotDir) await fs.mkdir(screenshotDir, { recursive: true });
  browser = await chromium.launch({ headless: true });
  for (const width of [390, 1280]) {
    const page = await browser.newPage({ viewport: { width, height: 900 }, colorScheme: 'light' });
    await page.route('**/*', (route) => {
      if (new URL(route.request().url()).origin === origin) return route.continue();
      return route.abort();
    });
    for (const route of routes) {
      const errors: string[] = [];
      page.on('pageerror', (error) => errors.push(error.message));
      const response = await page.goto(`${origin}${route}`, { waitUntil: 'load' });
      if (response?.status() !== 200) errors.push(`HTTP ${response?.status() ?? 'no response'}`);
      const state = await page.evaluate(() => ({
        title: document.title.trim(),
        main: document.querySelector('main') !== null,
        overflow: document.documentElement.scrollWidth > window.innerWidth + 2,
        brokenImages: [...document.images].filter((image) => image.currentSrc.startsWith(location.origin) && (!image.complete || image.naturalWidth === 0)).map((image) => image.getAttribute('src')),
      }));
      const layout = await page.evaluate(() => {
        const main = document.querySelector('main');
        if (!main) return undefined;
        const mainRect = main.getBoundingClientRect();
        const heading = main.querySelector('h1');
        const headingRect = heading?.getBoundingClientRect();
        const prose = main.querySelector('.prose');
        const content = [];
        for (const element of main.querySelectorAll('.prose img, .prose table, .prose figure, .code-block')) {
          const rect = element.getBoundingClientRect();
          content.push({ label: element.tagName.toLowerCase(), left: rect.left, right: rect.right });
        }
        return {
          viewportWidth: window.innerWidth,
          main: { left: mainRect.left, right: mainRect.right },
          heading: headingRect ? { left: headingRect.left, right: headingRect.right } : undefined,
          proseFontSize: prose ? Number.parseFloat(getComputedStyle(prose).fontSize) : undefined,
          content,
        };
      });
      if (!state.title) errors.push('empty page title');
      if (!state.main) errors.push('missing main content');
      if (state.overflow) errors.push('horizontal page overflow');
      if (state.brokenImages.length) errors.push(`broken local images: ${state.brokenImages.join(', ')}`);
      if (layout) errors.push(...evaluateVisualLayout(layout));
      if (screenshotDir) {
        const name = route === '/' ? 'root' : route.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9-]+/gi, '-');
        await page.screenshot({ path: path.join(screenshotDir, `${name}-${width}.png`), animations: 'disabled' });
      }
      if (errors.length) throw new Error(`${route} at ${width}px: ${errors.join('; ')}`);
      if (route.endsWith('/search/')) {
        const article = content.posts.find((post) => route.startsWith(`/${post.lang}/`));
        if (article) {
          await page.locator('[data-search-results] .search-result').first().waitFor();
          await page.locator('[data-search-input]').fill(article.title);
          await page.locator(`[data-search-results] a[href="${article.url}"]`).first().waitFor();
        }
      }
      const tocToggle = page.locator('[data-article-toc-toggle]');
      if (await tocToggle.count()) {
        await tocToggle.click();
        if (await tocToggle.getAttribute('aria-expanded') !== 'true') throw new Error(`${route} at ${width}px: article TOC did not open`);
        await page.locator('[data-article-toc-link]').first().click();
        if (!new URL(page.url()).hash) throw new Error(`${route} at ${width}px: article TOC link did not navigate`);
      }
      if (route === '/zh/') {
        const before = await page.locator('html').getAttribute('data-theme');
        await page.locator('#theme-toggle').click();
        const after = await page.locator('html').getAttribute('data-theme');
        if (before === after) throw new Error(`${route} at ${width}px: theme toggle did not change theme`);
      }
      if (errors.length) throw new Error(`${route} at ${width}px: ${errors.join('; ')}`);
      console.log(`ok: ${route} at ${width}px`);
      page.removeAllListeners('pageerror');
    }
    await page.close();
  }
} finally {
  await browser?.close();
  await new Promise<void>((resolve) => server.close(() => resolve()));
}
