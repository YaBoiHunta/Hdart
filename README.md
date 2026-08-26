# Hunter Darts

A simple, mobile-friendly dart scoreboard for playing 301/501 with friends. Add players, pick a mode, and tap the segment you hit after each dart — the app tracks scores, turns, and busts for you.

Live site: https://yaboihunta.github.io/Hdart/

## Stack

- React + Vite (no backend, fully static)
- Deployed via GitHub Actions to GitHub Pages (see `.github/workflows/deploy.yml`)

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```

## Deploying

Push to `master` and the GitHub Actions workflow builds and publishes to GitHub Pages automatically. In the repo's **Settings → Pages**, the source must be set to **GitHub Actions** (not "Deploy from a branch") — one-time setup.

## Docs

- [`docs/GAME_RULES.md`](docs/GAME_RULES.md) — scoring rules and mechanics implemented
- [`docs/DESIGN.md`](docs/DESIGN.md) — screen layout and UI reference
- [`CLAUDE.md`](CLAUDE.md) — project context for AI-assisted development
