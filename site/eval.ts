import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import type { ChangedArticle, Diagnostic } from './eval/contentEval.js';
import { runEvaluation } from './eval/run.js';

interface EvalOptions {
  changed?: ChangedArticle[];
  report?: string;
  baseRef?: string;
}

export function parseEvalArgs(args: string[]): EvalOptions {
  const changed = new Map<string, ChangedArticle>();
  let scoped = false;
  let report: string | undefined;
  let baseRef: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (arg === '--all') { scoped = false; changed.clear(); continue; }
    if (arg === '--changed-only') { scoped = true; continue; }
    if (arg === '--changed-file' || arg === '--new-file') {
      const file = args[++index];
      if (!file || file.startsWith('--')) throw new Error(`${arg} needs a path`);
      scoped = true;
      const previous = changed.get(file);
      changed.set(file, { path: file, isNew: arg === '--new-file' || previous?.isNew === true });
      continue;
    }
    if (arg === '--report') {
      report = args[++index];
      if (!report || report.startsWith('--')) throw new Error('--report needs a path');
      continue;
    }
    if (arg === '--base-ref') {
      baseRef = args[++index];
      if (!baseRef || baseRef.startsWith('--')) throw new Error('--base-ref needs a Git revision');
      continue;
    }
    throw new Error(`Unknown option: ${arg}`);
  }
  return { changed: scoped ? [...changed.values()] : undefined, report, baseRef };
}

export function formatGithubAnnotation(item: Diagnostic, root: string): string {
  const property = (value: string) => value.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A').replace(/,/g, '%2C');
  const message = item.message.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
  const file = path.relative(root, item.file).split(path.sep).join('/');
  return `::${item.severity} file=${property(file)},line=${item.line},title=${property(item.rule)}::${message}`;
}

async function main(): Promise<void> {
  const options = parseEvalArgs(process.argv.slice(2));
  const result = await runEvaluation(process.cwd(), options.changed, options.baseRef);
  for (const item of [...result.errors, ...result.warnings]) {
    const relative = path.relative(process.cwd(), item.file);
    console.log(`${item.severity}: ${relative}:${item.line} [${item.rule}] ${item.message}`);
    if (process.env.GITHUB_ACTIONS === 'true') console.log(formatGithubAnnotation(item, process.cwd()));
  }
  console.log(`checked ${result.checkedArticles} articles, gave editorial feedback on ${result.editorialArticles}, and evaluated ${result.claimCases} claim cases: ${result.errors.length} errors, ${result.warnings.length} advisories`);
  if (options.report) {
    await fs.mkdir(path.dirname(options.report), { recursive: true });
    await fs.writeFile(options.report, `${JSON.stringify(result, null, 2)}\n`);
  }
  if (result.errors.length > 0) process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });
}
