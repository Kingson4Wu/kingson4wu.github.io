import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { runEvaluation } from '../site/eval/run.js';

describe('runEvaluation', () => {
  it('checks links in unchanged articles when no article is selected for editorial feedback', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-eval-run-'));
    const source = path.join(root, 'content/zh/posts/old.md');
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.mkdir(path.join(root, 'evals'), { recursive: true });
    await fs.writeFile(source, `---\ntitle: Old\ndate: '2026-10-02T00:00:00.000Z'\nlang: zh\ntype: post\nslug: old\ndescription: Brief\ntags: []\n---\n\n[Deleted](/zh/posts/deleted/)`);
    await fs.writeFile(path.join(root, 'evals/claims.json'), '{"cases":[]}');

    const result = await runEvaluation(root, []);

    expect(result.errors).toContainEqual(expect.objectContaining({ rule: 'internal-link', file: source }));
    expect(result.checkedArticles).toBe(1);
    expect(result.warnings).toEqual([]);
  });

  it('combines publication errors, claim checks and editorial warnings for changed files', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-eval-run-'));
    const source = path.join(root, 'content/zh/posts/new.md');
    await fs.mkdir(path.dirname(source), { recursive: true });
    await fs.mkdir(path.join(root, 'evals'), { recursive: true });
    await fs.writeFile(source, `---\ntitle: New\ndate: '2026-10-02T00:00:00.000Z'\nlang: zh\ntype: post\nslug: new\ndescription: Brief\ntags: []\n---\n\n对这篇文章来说，[Missing](/zh/posts/absent/)`);
    await fs.writeFile(path.join(root, 'evals/claims.json'), '{"cases":[]}');
    const result = await runEvaluation(root, [{ path: source, isNew: true }]);
    expect(result.errors.map((item) => item.rule)).toEqual(['internal-link']);
    expect(result.warnings.map((item) => item.rule)).toEqual(['editorial-aside']);
    expect(result.warnings[0].line).toBe(11);
  });

  it('does not silently skip a requested source file that was not loaded', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-eval-run-'));
    await fs.mkdir(path.join(root, 'evals'), { recursive: true });
    await fs.writeFile(path.join(root, 'evals/claims.json'), '{"cases":[]}');
    await expect(runEvaluation(root, [{ path: path.join(root, 'content/zh/posts/missing.md'), isNew: true }]))
      .rejects.toThrow('not loaded');
  });

  it('detects a changed existing URL against the base revision and accepts a redirect', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'blog-eval-route-'));
    const file = path.join(root, 'content/zh/posts/article.md');
    await fs.mkdir(path.dirname(file), { recursive: true });
    await fs.mkdir(path.join(root, 'evals'), { recursive: true });
    const article = (slug: string) => `---\ntitle: Article\ndate: '2026-10-02T00:00:00.000Z'\nlang: zh\ntype: post\nslug: ${slug}\ndescription: Brief\n---\n\nBody`;
    await fs.writeFile(file, article('original'));
    await fs.writeFile(path.join(root, 'evals/claims.json'), '{"cases":[]}');
    execFileSync('git', ['init', '-q'], { cwd: root });
    execFileSync('git', ['add', '.'], { cwd: root });
    execFileSync('git', ['-c', 'user.name=Eval Test', '-c', 'user.email=eval@example.org', 'commit', '-qm', 'baseline'], { cwd: root });
    const base = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
    await fs.writeFile(file, article('changed'));

    const changed = [{ path: file, isNew: false }];
    expect((await runEvaluation(root, changed, base)).errors.map((item) => item.rule)).toEqual(['article-route-changed']);

    await fs.writeFile(path.join(root, 'content/legacy-redirects.json'), JSON.stringify([
      { from: '/zh/posts/original/', to: '/zh/posts/changed/' },
    ]));
    expect((await runEvaluation(root, changed, base)).errors).toEqual([]);
  });
});
import { execFileSync } from 'node:child_process';
