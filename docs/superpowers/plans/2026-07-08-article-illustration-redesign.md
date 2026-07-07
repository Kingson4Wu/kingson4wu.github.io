# Article Illustration Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Status update:** This plan was superseded after implementation review. The approved scope is now to keep the source-first drawing workflow, image audit tooling, tests, and figure CSS, while leaving existing article pictures in place unless a specific redraw is requested.

**Goal:** Add a source-first illustration workflow and image-quality checks. Do not require a pilot batch to replace existing AI/LLM article figures.

**Architecture:** Keep the static generator simple: figure rendering stays in Markdown/HTML, image audit logic lives in one focused content module, and visual assets remain article-adjacent under `content/zh/assets/posts/<slug>/`. The first implementation should publish static SVGs and warnings, not introduce a full rendering platform.

**Tech Stack:** TypeScript, Vitest, markdown-it with trusted inline HTML, static SVG assets, existing CSS in `site/styles/main.css`, existing `npm run check` / `npm run build`, Playwright for final screenshot verification.

---

## File Structure

- Modify `site/content/check.ts`: include image-audit warnings in the existing content check.
- Create `site/content/imageAudit.ts`: parse Markdown/HTML image references, detect empty alt text, missing figure captions, and very tall local image dimensions.
- Create `tests/imageAudit.test.ts`: unit tests for image reference parsing and warning generation.
- Modify `tests/loadContent.test.ts`: assert `checkContent` emits warnings for empty alt text without failing the build.
- Modify `site/styles/main.css`: add article figure and figcaption styles while preserving existing `.prose img` behavior.
- Modify `tests/renderPages.test.ts`: assert trusted figure HTML remains in article output.
- Do not modify existing article Markdown or add replacement SVGs unless a specific article redraw is requested.

## Task 1: Add Image Audit Module

**Files:**
- Create: `site/content/imageAudit.ts`
- Create: `tests/imageAudit.test.ts`

- [ ] **Step 1: Write failing tests for Markdown and HTML image audit**

Create `tests/imageAudit.test.ts`:

```ts
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { auditPostImages, findImageReferences } from '../site/content/imageAudit.js';

describe('image audit', () => {
  it('finds Markdown and HTML image references with alt text and captions', () => {
    const markdown = [
      '![](/assets/zh/posts/sample/empty.png)',
      '![Pipeline](/assets/zh/posts/sample/pipeline.svg)',
      '<figure>',
      '  <img src="/assets/zh/posts/sample/flow.svg" alt="Flow diagram">',
      '  <figcaption>Flow from request to response.</figcaption>',
      '</figure>',
      '<img src="/assets/zh/posts/sample/no-alt.png">',
    ].join('\n');

    expect(findImageReferences(markdown)).toEqual([
      {
        kind: 'markdown',
        url: '/assets/zh/posts/sample/empty.png',
        alt: '',
        hasCaption: false,
      },
      {
        kind: 'markdown',
        url: '/assets/zh/posts/sample/pipeline.svg',
        alt: 'Pipeline',
        hasCaption: false,
      },
      {
        kind: 'html',
        url: '/assets/zh/posts/sample/flow.svg',
        alt: 'Flow diagram',
        hasCaption: true,
      },
      {
        kind: 'html',
        url: '/assets/zh/posts/sample/no-alt.png',
        alt: '',
        hasCaption: false,
      },
    ]);
  });

  it('warns for empty alt text, bare images, and very tall local images', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'image-audit-'));
    const assetDir = path.join(root, 'zh/assets/posts/sample');
    await fs.mkdir(assetDir, { recursive: true });
    await fs.writeFile(path.join(assetDir, 'tall.png'), makePngHeader(400, 5000));
    await fs.writeFile(path.join(assetDir, 'normal.svg'), '<svg viewBox="0 0 900 360"></svg>');

    const warnings = await auditPostImages({
      inputPath: 'content/zh/posts/sample.md',
      body: [
        '![](/assets/zh/posts/sample/tall.png)',
        '![Normal](/assets/zh/posts/sample/normal.svg)',
        '<figure><img src="/assets/zh/posts/sample/normal.svg" alt="Normal flow"><figcaption>Normal flow.</figcaption></figure>',
      ].join('\n'),
      contentDir: root,
    });

    expect(warnings).toEqual([
      'Empty image alt text in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png',
      'Bare article image should use <figure> with <figcaption> in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png',
      'Very tall image in content/zh/posts/sample.md: /assets/zh/posts/sample/tall.png is 400x5000',
      'Bare article image should use <figure> with <figcaption> in content/zh/posts/sample.md: /assets/zh/posts/sample/normal.svg',
    ]);
  });
});

function makePngHeader(width: number, height: number): Buffer {
  const buffer = Buffer.alloc(24);
  buffer.writeUInt32BE(0x89504e47, 0);
  buffer.writeUInt32BE(0x0d0a1a0a, 4);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```bash
npm test -- tests/imageAudit.test.ts
```

Expected: FAIL because `site/content/imageAudit.ts` does not exist.

- [ ] **Step 3: Implement the image audit module**

Create `site/content/imageAudit.ts`:

```ts
import fs from 'node:fs/promises';
import path from 'node:path';

export interface ImageReference {
  kind: 'markdown' | 'html';
  url: string;
  alt: string;
  hasCaption: boolean;
}

export interface AuditPostImagesOptions {
  inputPath: string;
  body: string;
  contentDir: string;
}

interface ImageDimensions {
  width: number;
  height: number;
}

const htmlImagePattern = /<img\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi;
const figurePattern = /<figure\b[\s\S]*?<\/figure>/gi;

export function findImageReferences(markdown: string): ImageReference[] {
  const references: ImageReference[] = [];

  for (const reference of findMarkdownImageReferences(markdown)) {
    references.push(reference);
  }

  const figureRanges = [...markdown.matchAll(figurePattern)].map((match) => ({
    start: match.index != null ? match.index : 0,
    end: (match.index != null ? match.index : 0) + match[0].length,
    html: match[0],
  }));

  for (const match of markdown.matchAll(htmlImagePattern)) {
    const index = match.index != null ? match.index : 0;
    const figure = figureRanges.find((range) => index >= range.start && index < range.end);
    references.push({
      kind: 'html',
      url: match[1],
      alt: getHtmlAttribute(match[0], 'alt') || '',
      hasCaption: figure != null && figure.html.toLowerCase().includes('<figcaption'),
    });
  }

  return references;
}

export async function auditPostImages(options: AuditPostImagesOptions): Promise<string[]> {
  const warnings: string[] = [];

  for (const reference of findImageReferences(options.body)) {
    if (!reference.url.startsWith('/assets/')) {
      continue;
    }

    if (reference.alt.trim().length === 0) {
      warnings.push(`Empty image alt text in ${options.inputPath}: ${reference.url}`);
    }

    if (!reference.hasCaption) {
      warnings.push(`Bare article image should use <figure> with <figcaption> in ${options.inputPath}: ${reference.url}`);
    }

    const assetPath = assetUrlToContentPath(reference.url, options.contentDir);
    if (assetPath == null) {
      continue;
    }

    const dimensions = await readImageDimensions(assetPath);
    if (dimensions != null && dimensions.height >= 3000 && dimensions.height / dimensions.width >= 3) {
      warnings.push(
        `Very tall image in ${options.inputPath}: ${reference.url} is ${dimensions.width}x${dimensions.height}`,
      );
    }
  }

  return warnings;
}

function findMarkdownImageReferences(markdown: string): ImageReference[] {
  const references: ImageReference[] = [];
  let cursor = 0;

  while (cursor < markdown.length) {
    const imageStart = markdown.indexOf('![', cursor);
    if (imageStart === -1) {
      break;
    }

    const altEnd = markdown.indexOf('](', imageStart + 2);
    if (altEnd === -1) {
      cursor = imageStart + 2;
      continue;
    }

    const destinationStart = altEnd + 2;
    const destinationEnd = findMarkdownDestinationEnd(markdown, destinationStart);
    if (destinationEnd == null) {
      cursor = destinationStart;
      continue;
    }

    references.push({
      kind: 'markdown',
      url: extractMarkdownDestination(markdown.slice(destinationStart, destinationEnd)),
      alt: markdown.slice(imageStart + 2, altEnd),
      hasCaption: false,
    });

    cursor = destinationEnd + 1;
  }

  return references;
}

function findMarkdownDestinationEnd(markdown: string, start: number): number | undefined {
  let depth = 0;

  for (let index = start; index < markdown.length; index += 1) {
    const character = markdown[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '(') {
      depth += 1;
      continue;
    }
    if (character === ')') {
      if (depth === 0) {
        return index;
      }
      depth -= 1;
    }
  }

  return undefined;
}

function extractMarkdownDestination(rawDestination: string): string {
  const trimmed = rawDestination.trim();
  if (trimmed.startsWith('<')) {
    const closingBracket = trimmed.indexOf('>');
    return closingBracket === -1 ? trimmed : trimmed.slice(1, closingBracket);
  }

  let depth = 0;
  for (let index = 0; index < trimmed.length; index += 1) {
    const character = trimmed[index];
    if (character === '\\') {
      index += 1;
      continue;
    }
    if (character === '(') {
      depth += 1;
      continue;
    }
    if (character === ')') {
      depth = Math.max(0, depth - 1);
      continue;
    }
    if (depth === 0 && /\s/.test(character)) {
      return trimmed.slice(0, index);
    }
  }

  return trimmed;
}

function getHtmlAttribute(tag: string, name: string): string | undefined {
  const pattern = new RegExp(`\\b${name}=["']([^"']*)["']`, 'i');
  return tag.match(pattern)?.[1];
}

function assetUrlToContentPath(assetUrl: string, contentDir: string): string | undefined {
  const segments = assetUrl.split('/').filter(Boolean);
  const [assetsSegment, lang, ...rest] = segments;
  if (assetsSegment !== 'assets' || (lang !== 'en' && lang !== 'zh') || rest.length === 0) {
    return undefined;
  }

  const decodedSegments = rest.map(decodePathSegment);
  if (decodedSegments.some((segment) => segment === '..' || segment.includes('/') || segment.includes('\\'))) {
    return undefined;
  }

  const assetRoot = path.resolve(contentDir, lang, 'assets');
  const resolvedPath = path.resolve(assetRoot, ...decodedSegments);
  const relativePath = path.relative(assetRoot, resolvedPath);
  return relativePath.startsWith('..') || path.isAbsolute(relativePath) ? undefined : resolvedPath;
}

function decodePathSegment(segment: string): string {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment;
  }
}

async function readImageDimensions(filePath: string): Promise<ImageDimensions | undefined> {
  const buffer = await fs.readFile(filePath);
  if (buffer.length >= 24 && buffer.readUInt32BE(0) === 0x89504e47 && buffer.readUInt32BE(4) === 0x0d0a1a0a) {
    return {
      width: buffer.readUInt32BE(16),
      height: buffer.readUInt32BE(20),
    };
  }

  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.svg') {
    return readSvgDimensions(buffer.toString('utf8'));
  }

  return undefined;
}

function readSvgDimensions(svg: string): ImageDimensions | undefined {
  const viewBox = svg.match(/\bviewBox=["']\s*[-.\d]+\s+[-.\d]+\s+([.\d]+)\s+([.\d]+)\s*["']/i);
  if (viewBox) {
    return {
      width: Math.round(Number(viewBox[1])),
      height: Math.round(Number(viewBox[2])),
    };
  }

  const width = svg.match(/\bwidth=["']([.\d]+)(?:px)?["']/i)?.[1];
  const height = svg.match(/\bheight=["']([.\d]+)(?:px)?["']/i)?.[1];
  if (width != null && height != null) {
    return {
      width: Math.round(Number(width)),
      height: Math.round(Number(height)),
    };
  }

  return undefined;
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```bash
npm test -- tests/imageAudit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/content/imageAudit.ts tests/imageAudit.test.ts
git commit -m "feat: add article image audit"
```

## Task 2: Wire Image Audit Into Content Checks

**Files:**
- Modify: `site/content/check.ts`
- Modify: `tests/loadContent.test.ts`

- [ ] **Step 1: Write failing content-check integration test**

Append this test to `tests/loadContent.test.ts` inside the existing `describe('loadContent', () => { ... })` block:

```ts
  it('warns about empty alt text and bare local images without failing content checks', async () => {
    const root = await fs.mkdtemp(path.join(os.tmpdir(), 'content-'));
    await fs.mkdir(path.join(root, 'zh/posts'), { recursive: true });
    await fs.mkdir(path.join(root, 'zh/assets/posts/sample'), { recursive: true });
    await fs.writeFile(path.join(root, 'zh/assets/posts/sample/diagram.png'), 'image');
    await fs.writeFile(
      path.join(root, 'zh/posts/sample.md'),
      '---\ntitle: Sample\ndate: 2021-01-01T00:00:00.000Z\nlang: zh\ntype: post\nslug: sample\ntags: []\n---\n\n![](/assets/zh/posts/sample/diagram.png)',
    );

    const content = await loadContent(root);
    const result = await checkContent(content, root);

    expect(result.errors).toEqual([]);
    expect(result.warnings).toEqual([
      'Empty image alt text in ' + path.join(root, 'zh/posts/sample.md') + ': /assets/zh/posts/sample/diagram.png',
      'Bare article image should use <figure> with <figcaption> in ' + path.join(root, 'zh/posts/sample.md') + ': /assets/zh/posts/sample/diagram.png',
    ]);
  });
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```bash
npm test -- tests/loadContent.test.ts
```

Expected: FAIL because `checkContent` does not yet call `auditPostImages`.

- [ ] **Step 3: Call the image audit from `checkContent`**

Modify `site/content/check.ts`:

```ts
import { auditPostImages } from './imageAudit.js';
```

Inside the `for (const post of content.posts)` loop, after the existing asset existence loop, add:

```ts
    warnings.push(...await auditPostImages({
      inputPath: post.inputPath,
      body: post.body,
      contentDir,
    }));
```

- [ ] **Step 4: Run focused tests**

Run:

```bash
npm test -- tests/loadContent.test.ts tests/imageAudit.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/content/check.ts tests/loadContent.test.ts
git commit -m "feat: warn on unpolished article images"
```

## Task 3: Add Figure and Caption Styling

**Files:**
- Modify: `site/styles/main.css`
- Modify: `tests/renderPages.test.ts`

- [ ] **Step 1: Add render test showing figure HTML is preserved**

Append this test to `tests/renderPages.test.ts` inside `describe('page rendering', () => { ... })`:

```ts
  it('renders trusted figure markup for article illustrations', () => {
    const html = renderArticlePage({
      post: {
        ...post,
        html: '<figure><img src="/assets/zh/posts/sample/diagram.svg" alt="Pipeline"><figcaption>Pipeline caption.</figcaption></figure>',
      },
      previous: undefined,
      next: undefined,
    });

    expect(html).toContain('<figure>');
    expect(html).toContain('alt="Pipeline"');
    expect(html).toContain('<figcaption>Pipeline caption.</figcaption>');
  });
```

- [ ] **Step 2: Run render test**

Run:

```bash
npm test -- tests/renderPages.test.ts
```

Expected: PASS. This locks in that Markdown trusted HTML can carry figure blocks.

- [ ] **Step 3: Add figure CSS**

In `site/styles/main.css`, replace the current `.prose img` block:

```css
.prose img {
  cursor: zoom-in;
  display: block;
  height: auto;
  margin: 1.6rem auto;
  max-width: 100%;
}
```

with:

```css
.prose figure {
  margin: 2rem 0;
}

.prose figure img {
  margin: 0 auto;
}

.prose figcaption {
  color: var(--muted);
  font-family: var(--font-body);
  font-size: 0.92rem;
  line-height: 1.55;
  margin: 0.7rem auto 0;
  max-width: 42rem;
  text-align: center;
}

.prose img {
  cursor: zoom-in;
  display: block;
  height: auto;
  margin: 1.6rem auto;
  max-width: 100%;
}
```

This preserves legacy image spacing while letting images inside figures use figure-level spacing.

- [ ] **Step 4: Run tests**

Run:

```bash
npm test -- tests/renderPages.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add site/styles/main.css tests/renderPages.test.ts
git commit -m "style: add article figure captions"
```

## Task 4: Redesign the RAG Article Figures

**Files:**
- Create: `content/zh/assets/posts/20250220/illustration-src/rag-pipeline.svg`
- Create: `content/zh/assets/posts/20250220/rag-pipeline.svg`
- Modify: `content/zh/posts/20250220-rag-application-development.md`

- [ ] **Step 1: Create the RAG pipeline source SVG**

Create `content/zh/assets/posts/20250220/illustration-src/rag-pipeline.svg`:

```svg
<svg viewBox="0 0 960 360" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">RAG Pipeline</title>
  <desc id="desc">A question flows through retrieval, reranking, grounding, and answer generation.</desc>
  <rect width="960" height="360" fill="#f5f4ed"/>
  <g font-family="Georgia, 'Songti SC', 'STSong', serif" fill="#141413">
    <text x="48" y="50" font-size="28" font-weight="500">RAG 把外部知识放进生成上下文</text>
    <text x="48" y="80" font-size="15" fill="#504e49">关键不是“多一个数据库”，而是回答前先改变模型看到的证据。</text>
    <g font-size="16">
      <rect x="48" y="138" width="136" height="76" rx="8" fill="#faf9f5" stroke="#1B365D" stroke-width="2"/>
      <text x="116" y="171" text-anchor="middle" font-weight="500">问题</text>
      <text x="116" y="194" text-anchor="middle" fill="#6b6a64" font-size="13">用户意图</text>
      <rect x="250" y="98" width="150" height="76" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="325" y="131" text-anchor="middle" font-weight="500">检索</text>
      <text x="325" y="154" text-anchor="middle" fill="#6b6a64" font-size="13">Top-K 片段</text>
      <rect x="250" y="216" width="150" height="76" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="325" y="249" text-anchor="middle" font-weight="500">重排</text>
      <text x="325" y="272" text-anchor="middle" fill="#6b6a64" font-size="13">降低噪音</text>
      <rect x="486" y="138" width="160" height="76" rx="8" fill="#EEF2F7" stroke="#1B365D" stroke-width="2"/>
      <text x="566" y="171" text-anchor="middle" font-weight="500">上下文组装</text>
      <text x="566" y="194" text-anchor="middle" fill="#504e49" font-size="13">Prompt + Evidence</text>
      <rect x="730" y="138" width="150" height="76" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="805" y="171" text-anchor="middle" font-weight="500">生成答案</text>
      <text x="805" y="194" text-anchor="middle" fill="#6b6a64" font-size="13">带引用返回</text>
      <path d="M184 176 H240" fill="none" stroke="#1B365D" stroke-width="2"/>
      <path d="M400 136 C436 138 456 154 478 168" fill="none" stroke="#504e49" stroke-width="1.5"/>
      <path d="M400 254 C438 248 458 204 478 184" fill="none" stroke="#504e49" stroke-width="1.5"/>
      <path d="M646 176 H720" fill="none" stroke="#1B365D" stroke-width="2"/>
      <path d="M234 171 L244 176 L234 181" fill="none" stroke="#1B365D" stroke-width="2" stroke-linecap="round"/>
      <path d="M468 163 L478 168 L467 171" fill="none" stroke="#504e49" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M467 181 L478 184 L470 192" fill="none" stroke="#504e49" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M710 171 L720 176 L710 181" fill="none" stroke="#1B365D" stroke-width="2" stroke-linecap="round"/>
    </g>
    <text x="48" y="326" font-size="14" fill="#504e49">检索质量、重排策略和证据组织，共同决定最终回答是否可信。</text>
  </g>
</svg>
```

- [ ] **Step 2: Copy the source SVG to the published asset**

Run:

```bash
cp content/zh/assets/posts/20250220/illustration-src/rag-pipeline.svg content/zh/assets/posts/20250220/rag-pipeline.svg
```

- [ ] **Step 3: Replace the top RAG mind-map image with a figure block**

In `content/zh/posts/20250220-rag-application-development.md`, replace:

```md
![](/assets/zh/posts/20250220/RAG.png)
```

with:

```html
<figure>
  <img src="/assets/zh/posts/20250220/rag-pipeline.svg" alt="RAG pipeline from user question through retrieval, reranking, context grounding, and answer generation">
  <figcaption>RAG 的价值不在于多接一个知识库，而在于生成前先改变模型看到的证据上下文。</figcaption>
</figure>
```

- [ ] **Step 4: Run content checks**

Run:

```bash
npm run check
```

Expected: command exits 0. Warnings from older non-pilot images may be printed; the new RAG figure should not emit empty-alt or bare-image warnings.

- [ ] **Step 5: Build the site**

Run:

```bash
npm run build
```

Expected: command exits 0 and copies `rag-pipeline.svg` into `dist/assets/zh/posts/20250220/rag-pipeline.svg`.

- [ ] **Step 6: Commit**

```bash
git add content/zh/assets/posts/20250220/illustration-src/rag-pipeline.svg content/zh/assets/posts/20250220/rag-pipeline.svg content/zh/posts/20250220-rag-application-development.md
git commit -m "improve: redesign rag article figure"
```

## Task 5: Redesign Remaining Pilot Figures

**Files:**
- Create/modify:
  - `content/zh/assets/posts/20250221/illustration-src/agent-capability-stack.svg`
  - `content/zh/assets/posts/20250221/agent-capability-stack.svg`
  - `content/zh/posts/20250221-ai-agent-development-notes.md`
  - `content/zh/assets/posts/20241226/illustration-src/llm-training-path.svg`
  - `content/zh/assets/posts/20241226/llm-training-path.svg`
  - `content/zh/posts/20241226-llm-technology-overview.md`
  - `content/zh/assets/posts/20260419-skill-anthropic-vs-openai-agent-sdk/illustration-src/skill-loading-comparison.svg`
  - `content/zh/assets/posts/20260419-skill-anthropic-vs-openai-agent-sdk/skill-loading-comparison.svg`
  - `content/zh/posts/20260419-anthropic-skill-vs-openai-agent-sdk.md`

- [ ] **Step 1: Create the AI Agent capability stack source and output**

Create `content/zh/assets/posts/20250221/illustration-src/agent-capability-stack.svg` and copy it to `content/zh/assets/posts/20250221/agent-capability-stack.svg`.

Use this structure:

```svg
<svg viewBox="0 0 960 420" xmlns="http://www.w3.org/2000/svg" role="img" aria-labelledby="title desc">
  <title id="title">AI Agent Capability Stack</title>
  <desc id="desc">An AI Agent layers model reasoning with planning, memory, tools, action, and feedback.</desc>
  <rect width="960" height="420" fill="#f5f4ed"/>
  <g font-family="Georgia, 'Songti SC', 'STSong', serif" fill="#141413">
    <text x="52" y="56" font-size="28" font-weight="500">Agent 是能闭环行动的大模型应用</text>
    <text x="52" y="86" font-size="15" fill="#504e49">从“生成答案”到“规划、调用工具、观察结果、继续推进”。</text>
    <rect x="122" y="292" width="716" height="58" rx="8" fill="#EEF2F7" stroke="#1B365D" stroke-width="2"/>
    <text x="480" y="326" text-anchor="middle" font-size="18" font-weight="500">大语言模型：理解、推理、生成</text>
    <g font-size="15">
      <rect x="122" y="138" width="132" height="72" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="188" y="170" text-anchor="middle" font-weight="500">规划</text>
      <text x="188" y="192" text-anchor="middle" fill="#6b6a64" font-size="12">拆解任务</text>
      <rect x="282" y="138" width="132" height="72" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="348" y="170" text-anchor="middle" font-weight="500">记忆</text>
      <text x="348" y="192" text-anchor="middle" fill="#6b6a64" font-size="12">保留上下文</text>
      <rect x="442" y="138" width="132" height="72" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="508" y="170" text-anchor="middle" font-weight="500">工具</text>
      <text x="508" y="192" text-anchor="middle" fill="#6b6a64" font-size="12">连接外部世界</text>
      <rect x="602" y="138" width="132" height="72" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="668" y="170" text-anchor="middle" font-weight="500">行动</text>
      <text x="668" y="192" text-anchor="middle" fill="#6b6a64" font-size="12">执行步骤</text>
      <rect x="762" y="138" width="132" height="72" rx="8" fill="#faf9f5" stroke="#e8e6dc" stroke-width="2"/>
      <text x="828" y="170" text-anchor="middle" font-weight="500">反馈</text>
      <text x="828" y="192" text-anchor="middle" fill="#6b6a64" font-size="12">观察再规划</text>
      <path d="M188 210 V282" stroke="#504e49" stroke-width="1.5"/>
      <path d="M348 210 V282" stroke="#504e49" stroke-width="1.5"/>
      <path d="M508 210 V282" stroke="#1B365D" stroke-width="2"/>
      <path d="M668 210 V282" stroke="#504e49" stroke-width="1.5"/>
      <path d="M828 210 V282" stroke="#504e49" stroke-width="1.5"/>
    </g>
  </g>
</svg>
```

- [ ] **Step 2: Update the AI Agent article**

In `content/zh/posts/20250221-ai-agent-development-notes.md`, replace both initial bare image references with this single figure:

```html
<figure>
  <img src="/assets/zh/posts/20250221/agent-capability-stack.svg" alt="AI Agent capability stack with planning, memory, tools, action, feedback, and a language model foundation">
  <figcaption>Agent 的关键变化，是让大模型从一次性生成答案，变成可以规划、行动、观察并继续推进的闭环系统。</figcaption>
</figure>
```

- [ ] **Step 3: Create the LLM training path figure**

Create `content/zh/assets/posts/20241226/illustration-src/llm-training-path.svg` and copy it to `content/zh/assets/posts/20241226/llm-training-path.svg`.

The figure must contain these ordered nodes: `预训练语料`, `下一个 Token 预测`, `基础模型`, `指令微调`, `人类反馈对齐`, `应用接口`. Use the same parchment/ink-blue/warm-gray palette and set `基础模型` as the focal node with `#EEF2F7` fill and `#1B365D` stroke.

- [ ] **Step 4: Update the LLM overview article**

In `content/zh/posts/20241226-llm-technology-overview.md`, replace the two initial image references:

```md
![](/assets/zh/posts/20241226/LLM_position.png)
![](/assets/zh/posts/20241226/LLM.png)
```

with:

```html
<figure>
  <img src="/assets/zh/posts/20241226/llm-training-path.svg" alt="LLM training path from pretraining data through next-token prediction, base model, instruction tuning, alignment, and application APIs">
  <figcaption>大语言模型的工程路径，可以先看成从预训练到指令微调、对齐，再到应用接口的一条能力加工链。</figcaption>
</figure>
```

- [ ] **Step 5: Create the Skill loading comparison figure**

Create `content/zh/assets/posts/20260419-skill-anthropic-vs-openai-agent-sdk/illustration-src/skill-loading-comparison.svg` and copy it to `content/zh/assets/posts/20260419-skill-anthropic-vs-openai-agent-sdk/skill-loading-comparison.svg`.

The figure must show two horizontal lanes:

- `Anthropic: Skill 调用 -> 编排层读取 SKILL.md -> newMessages 注入上下文 -> contextModifier 动态授权`
- `OpenAI: load_skill -> 复制 skill 文件 -> Read 读取 SKILL.md -> 静态工具权限`

Use ink-blue only on the step that differs most: `newMessages 注入上下文` in the Anthropic lane and `Read 读取 SKILL.md` in the OpenAI lane.

- [ ] **Step 6: Update the Skill comparison article**

In `content/zh/posts/20260419-anthropic-skill-vs-openai-agent-sdk.md`, replace the first two image sections with the new comparison figure and keep the later detailed diagrams only if they still add information after the new figure.

Use this figure block near the “真正的差异在哪” section:

```html
<figure>
  <img src="/assets/zh/posts/20260419-skill-anthropic-vs-openai-agent-sdk/skill-loading-comparison.svg" alt="Comparison of Anthropic push-based skill loading and OpenAI pull-based skill loading">
  <figcaption>两套 Skill 机制的关键差异不是是否延迟加载，而是内容交付路径：Anthropic 偏 push，OpenAI 偏 pull。</figcaption>
</figure>
```

- [ ] **Step 7: Run checks and build**

Run:

```bash
npm run check
npm run build
```

Expected: both commands exit 0. Existing legacy warnings may remain; newly edited pilot images should not emit empty-alt or bare-image warnings.

- [ ] **Step 8: Commit**

```bash
git add content/zh/assets/posts/20250221 content/zh/assets/posts/20241226 content/zh/assets/posts/20260419-skill-anthropic-vs-openai-agent-sdk content/zh/posts/20250221-ai-agent-development-notes.md content/zh/posts/20241226-llm-technology-overview.md content/zh/posts/20260419-anthropic-skill-vs-openai-agent-sdk.md
git commit -m "improve: redesign ai article figures"
```

## Task 6: Visual QA and Final Verification

**Files:**
- No source file changes expected unless screenshots expose layout defects.

- [ ] **Step 1: Start the local dev server**

Run:

```bash
npm run dev
```

Expected: dev server prints a local URL. Keep this session running until visual checks finish.

- [ ] **Step 2: Capture targeted screenshots**

In a separate terminal, run this Playwright script with the dev server URL substituted for `http://localhost:3000` if needed:

```bash
node <<'NODE'
const { chromium } = require('playwright');

const base = process.env.BLOG_PREVIEW_URL || 'http://localhost:3000';
const pages = [
  '/zh/posts/20250220/',
  '/zh/posts/20250221/',
  '/zh/posts/20241226/',
  '/zh/posts/20260419-skill-anthropic-vs-openai-agent-sdk/',
];

(async () => {
  const browser = await chromium.launch();
  for (const viewport of [
    { width: 390, height: 844, label: 'mobile' },
    { width: 1280, height: 900, label: 'desktop' },
  ]) {
    const page = await browser.newPage({ viewport });
    for (const route of pages) {
      await page.goto(base + route, { waitUntil: 'networkidle' });
      await page.screenshot({
        path: `tmp-${route.replaceAll('/', '-').replace(/^-|-$/g, '')}-${viewport.label}.png`,
        fullPage: true,
      });
    }
    await page.close();
  }
  await browser.close();
})();
NODE
```

Expected: screenshots are created for each pilot article at mobile and desktop widths.

- [ ] **Step 3: Inspect screenshots**

Open the generated PNGs and verify:

- figures fit within article width,
- captions do not overlap surrounding content,
- SVG text remains readable on mobile,
- the parchment figure background does not clash with the site background,
- image click/zoom cursor still appears on figure images.

- [ ] **Step 4: Run full verification**

Run:

```bash
npm test
npm run check
npm run build
```

Expected: all commands exit 0.

- [ ] **Step 5: Commit screenshot-driven fixes**

If source changes were needed after screenshot review:

```bash
git add site/styles/main.css content/zh/posts content/zh/assets/posts
git commit -m "fix: polish pilot article figures"
```

If no source changes were needed, do not create a commit.

- [ ] **Step 6: Final status**

Run:

```bash
git status --short
```

Expected: no uncommitted source changes, except ignored local screenshot files if they were not deleted.

Delete temporary screenshots when finished:

```bash
rm -f tmp-zh-posts-*.png
```
