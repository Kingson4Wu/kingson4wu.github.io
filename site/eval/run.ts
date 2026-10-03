import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import matter from 'gray-matter';
import { loadLegacyRedirects } from '../content/legacyRedirects.js';
import { loadContent } from '../content/loadContent.js';
import { normalizeFrontmatter } from '../content/frontmatter.js';
import { evaluateClaims, type ClaimCase } from './claims.js';
import { evaluateContent, type ChangedArticle, type Diagnostic } from './contentEval.js';
import { evaluateEditorial } from './editorial.js';
import { evaluateRouteChange } from './routeChanges.js';

const execFileAsync = promisify(execFile);

export interface EvaluationReport {
  errors: Diagnostic[];
  warnings: Diagnostic[];
  checkedArticles: number;
  editorialArticles: number;
  claimCases: number;
}

export async function runEvaluation(root: string, changed?: ChangedArticle[], baseRef?: string): Promise<EvaluationReport> {
  const content = await loadContent(path.join(root, 'content'));
  const selected = changed ?? content.posts.map((post) => ({ path: post.inputPath, isNew: false }));
  const selectedPaths = new Set(selected.map((item) => path.resolve(item.path)));
  const loadedPaths = new Set(content.posts.map((post) => path.resolve(post.inputPath)));
  for (const file of selectedPaths) {
    if (!loadedPaths.has(file)) throw new Error(`Requested source article was not loaded: ${file}`);
  }
  const claimsPath = path.join(root, 'evals/claims.json');
  const claimData: unknown = JSON.parse(await fs.readFile(claimsPath, 'utf8'));
  if (claimData == null || typeof claimData !== 'object' || !Array.isArray((claimData as { cases?: unknown }).cases)) {
    throw new Error(`${claimsPath} must contain a cases array`);
  }
  const cases = (claimData as { cases: ClaimCase[] }).cases;
  const newPaths = new Set(selected.filter((item) => item.isNew).map((item) => path.resolve(item.path)));
  const allArticles = content.posts.map((post) => ({
    path: post.inputPath,
    isNew: newPaths.has(path.resolve(post.inputPath)),
  }));
  const contentDiagnostics = await evaluateContent(content.posts, allArticles);
  const postByPath = new Map(content.posts.map((post) => [path.resolve(post.inputPath), post]));
  const routeDiagnostics: Diagnostic[] = [];
  if (baseRef && changed) {
    const redirects = await loadLegacyRedirects(path.join(root, 'content/legacy-redirects.json'), content.posts);
    for (const item of changed) {
      if (item.isNew) continue;
      const file = path.resolve(item.path);
      const post = postByPath.get(file);
      if (post == null) continue;
      const relative = path.relative(root, file).split(path.sep).join('/');
      const { stdout } = await execFileAsync('git', ['show', `${baseRef}:${relative}`], { cwd: root, maxBuffer: 4 * 1024 * 1024 });
      const previous = matter(stdout);
      const previousSlug = normalizeFrontmatter({
        raw: previous.data,
        rawFrontmatter: previous.matter,
        lang: post.lang,
        type: post.type,
        fallbackSlug: path.basename(file, '.md'),
        sourcePath: relative,
        sourceRepo: post.lang,
      }).slug;
      routeDiagnostics.push(...evaluateRouteChange(post, previousSlug, redirects, await fs.readFile(file, 'utf8')));
    }
  }
  const bodyDiagnostics = [
    ...evaluateClaims(content.posts, cases, root),
    ...content.posts.filter((post) => selectedPaths.has(path.resolve(post.inputPath))).flatMap((post) => evaluateEditorial(post.inputPath, post.body)),
  ];
  const offsets = new Map<string, number>();
  for (const item of bodyDiagnostics) {
    const file = path.resolve(item.file);
    const post = postByPath.get(file);
    if (post == null) continue;
    let offset = offsets.get(file);
    if (offset == null) {
      const source = await fs.readFile(file, 'utf8');
      const bodyStart = source.indexOf(post.body);
      offset = bodyStart < 0 ? 0 : (source.slice(0, bodyStart).match(/\n/g) ?? []).length;
      offsets.set(file, offset);
    }
    item.line += offset;
  }
  const diagnostics = [...contentDiagnostics, ...routeDiagnostics, ...bodyDiagnostics];
  return {
    errors: diagnostics.filter((item) => item.severity === 'error'),
    warnings: diagnostics.filter((item) => item.severity === 'warning'),
    checkedArticles: content.posts.length,
    editorialArticles: content.posts.filter((post) => selectedPaths.has(path.resolve(post.inputPath))).length,
    claimCases: cases.length,
  };
}
