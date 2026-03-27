# Blog Checklist

## What Each Repo Does

- `kingson4wu.github.io`: root redirect only
- `zh`: Chinese blog
- `en`: English blog

## Change Default Landing Path

Edit `redirect-config.js`:

```js
window.ROOT_REDIRECT_TARGET = '/zh/';
```

Common values:

- Chinese default: `'/zh/'`
- English default: `'/en/'`

Then:

1. Commit
2. Push `main`
3. Check `https://kingson4wu.github.io/`

## Publish `zh`

1. Commit
2. Push `main`
3. Check `https://kingson4wu.github.io/zh/`

## Publish `en`

1. Commit
2. Push `main`
3. Check `https://kingson4wu.github.io/en/`

## Quick Final Check

```bash
curl -sL https://kingson4wu.github.io/ | rg 'window.location.replace|/zh/|/en/'
curl -I https://kingson4wu.github.io/zh/
curl -I https://kingson4wu.github.io/en/
curl -I https://kingson4wu.github.io/zh/archives/
curl -I https://kingson4wu.github.io/en/blog/
```
