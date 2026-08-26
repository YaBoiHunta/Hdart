# Hunter Darts

A simple, mobile-friendly dart scoreboard for playing 301, 501, or Around the World with friends. Add players, pick a mode, and tap the segment you hit after each dart — the app tracks scores, turns, and busts (or targets, for Around the World) for you. The current game survives a refresh, and a "History" screen lists completed games (who won, mode, per-player average) — both stored locally in the browser, no account or backend required.

Live site: https://yaboihunta.github.io/Hdart/

## Stack

- React + Vite + TypeScript (strict mode) (no backend, fully static)
- Deployed via GitHub Actions to GitHub Pages (see `.github/workflows/deploy.yml`)

## Local development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build     # tsc -b (type-check) && vite build
npm run preview
```

## Type checking

```bash
npm run typecheck   # tsc -b --noEmit, no build output
```

Runs in CI (`.github/workflows/test.yml`) and as part of `npm run build`, so a type error fails both.

## Testing

```bash
npm test        # run once
npm run test:watch   # watch mode while developing
```

Covers the scoring engine (`src/game/gameReducer.test.ts`), the shared types/mode registry (`src/game/types.test.ts`, `src/game/modes.test.ts`), the completed-game history log (`src/game/history.test.ts`), and the actual click-driven UI flows — mode select, player setup, number pad, multiplier toggle, undo, busts, wins, turn history, persistence (`src/App.test.tsx`).

## Deploying

Push to `master` and the GitHub Actions workflow builds and publishes to GitHub Pages automatically. In the repo's **Settings → Pages**, the source must be set to **GitHub Actions** (not "Deploy from a branch") — one-time setup.

## Docs

- [`docs/GAME_RULES.md`](docs/GAME_RULES.md) — scoring rules and mechanics implemented
- [`docs/DESIGN.md`](docs/DESIGN.md) — screen layout and UI reference
- [`CLAUDE.md`](CLAUDE.md) — project context for AI-assisted development
