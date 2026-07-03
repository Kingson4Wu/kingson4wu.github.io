import http from 'node:http';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import fse from 'fs-extra';
import { siteConfig } from './config.js';

const port = Number(process.env.PORT ?? 4321);

const contentTypes = new Map<string, string>([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.xml', 'application/xml; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
]);

const server = http.createServer(async (request, response) => {
  try {
    const filePath = await resolveRequestPath(request.url ?? '/');

    if (filePath == null) {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('Not found');
      return;
    }

    response.writeHead(200, {
      'content-type': contentTypes.get(path.extname(filePath).toLowerCase()) ?? 'application/octet-stream',
    });
    createReadStream(filePath).pipe(response);
  } catch (error) {
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end(error instanceof Error ? error.message : String(error));
  }
});

async function resolveRequestPath(rawUrl: string): Promise<string | undefined> {
  const url = new URL(rawUrl, 'http://localhost');
  const decodedPath = decodeURIComponent(url.pathname);
  const normalized = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  const relativePath = normalized === path.sep ? 'index.html' : normalized.replace(/^\/+/, '');
  const candidate = path.join(siteConfig.distDir, relativePath);
  const distRoot = path.resolve(siteConfig.distDir);
  const resolved = path.resolve(candidate);
  const distanceFromRoot = path.relative(distRoot, resolved);

  if (distanceFromRoot.startsWith('..') || path.isAbsolute(distanceFromRoot)) {
    return undefined;
  }

  if (await fileExists(resolved)) {
    return resolved;
  }

  const indexPath = path.join(resolved, 'index.html');
  if (await fileExists(indexPath)) {
    return indexPath;
  }

  return undefined;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const stats = await fse.stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

server.listen(port, () => {
  console.log(`serving dist at http://localhost:${port}/`);
});
