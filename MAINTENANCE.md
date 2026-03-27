# Blog Multi-Repo Maintenance

## Repo Roles

- `Kingson4Wu/kingson4wu.github.io`
  - Owns `https://kingson4wu.github.io/`
  - Does not host blog content
  - Only serves the root redirect page
- `Kingson4Wu/zh`
  - Chinese Hexo source
  - Publishes `https://kingson4wu.github.io/zh/`
- `Kingson4Wu/en`
  - English Astro source
  - Publishes `https://kingson4wu.github.io/en/`

## Change Default Landing Path

Edit `redirect-config.js` in `Kingson4Wu/kingson4wu.github.io`.

Current format:

```js
window.ROOT_REDIRECT_TARGET = '/zh/';
```

Examples:

- Chinese by default: `'/zh/'`
- English by default: `'/en/'`

After editing:

1. Commit the change on `main`
2. Push `main`
3. Verify `https://kingson4wu.github.io/` serves the updated redirect HTML

## Chinese Site

Local repo:

- `/Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.zh`

Key files:

- `_config.yml`
- `.github/workflows/deploy.yml`
- `README.md`

Publish flow:

1. Commit to `main`
2. Push `main`
3. GitHub Actions builds Hexo
4. Workflow publishes `public/` to `gh-pages`
5. GitHub Pages serves `https://kingson4wu.github.io/zh/`

Important settings:

- `url: https://kingson4wu.github.io`
- `root: /zh/`
- Deploy target repo: `git@github.com:Kingson4Wu/zh.git`
- Deploy branch: `gh-pages`

Quick checks:

```bash
git -C /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.zh status --short --branch
npm --prefix /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.zh ci
npm --prefix /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.zh exec hexo clean
npm --prefix /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.zh exec hexo generate
curl -I https://kingson4wu.github.io/zh/
```

## English Site

Local repo:

- `/Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.en`

Key files:

- `astro.config.mjs`
- `.github/workflows/deploy.yml`
- `src/components/BaseHead.astro`
- `src/pages/rss.xml.js`

Publish flow:

1. Commit to `main`
2. Push `main`
3. GitHub Actions builds Astro
4. Workflow publishes `dist/` to `gh-pages`
5. GitHub Pages serves `https://kingson4wu.github.io/en/`

Important settings:

- `site: https://kingson4wu.github.io`
- `base: /en/`

Quick checks:

```bash
git -C /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.en status --short --branch
npm --prefix /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.en ci
npm --prefix /Users/kingsonwu/programming/kingson4wu/kingson4wu.github.io.en run build
curl -I https://kingson4wu.github.io/en/
curl -I https://kingson4wu.github.io/en/blog/
```

## Final Verification

After any root or language-site publish, check:

```bash
curl -sL https://kingson4wu.github.io/ | rg 'window.location.replace|/zh/|/en/'
curl -I https://kingson4wu.github.io/zh/
curl -I https://kingson4wu.github.io/en/
curl -I https://kingson4wu.github.io/zh/archives/
curl -I https://kingson4wu.github.io/en/blog/
```

## Operational Notes

- The root repo local checkout can stay on the historical `hexo` branch for archive purposes.
- Root-site publishing should be done from a clean worktree or clean local `main`.
- `zh` and `en` are now the only content source repos.
- If GitHub Pages appears stale just after push, wait for cache propagation and re-check the live HTML before assuming publish failure.
