# CLAUDE.md

Project context for AI-assisted development on Hunter Darts.

## What this is

A simple dart scoreboard web app for the user and friends to track scores while playing darts in person. One phone/device is passed around the table; players tap the segment they hit after each dart instead of doing mental math.

## Stack & constraints

- React + Vite, plain CSS — no UI framework, no backend, no database.
- Must stay deployable for free on **GitHub Pages** (static build only). Don't introduce anything that needs a server (no API routes, no server-side rendering).
- Repo is `YaBoiHunta/Hdart`, default branch `master` — `vite.config.js` sets `base: '/Hdart/'` to match the GitHub Pages project-site URL (`https://yaboihunta.github.io/Hdart/`). If the repo is ever renamed, update `base` to match, and vice versa.
- Deploy is automatic via `.github/workflows/deploy.yml` on push to `master`. Requires repo **Settings → Pages → Source: GitHub Actions** — if it's set to "Deploy from a branch" instead, Pages serves the raw unbuilt source and the site 404s on `/src/main.jsx` and other dev-only paths.

## Design source of truth

- `docs/DESIGN.md` — screen flow and layout decisions.
- `docs/GAME_RULES.md` — exact scoring/bust/undo rules implemented.
- `docs/assets/DartScreenLayout.jpg` — the reference screenshot the game-board UI is modeled after.

Read these before changing game logic or layout — they capture decisions made with the user, not just what the code happens to do.

## Architecture

- `src/game/modes.js` — game mode definitions (301, 501). Add new modes here.
- `src/game/gameReducer.js` — all game state and rules live in one `useReducer` reducer (`gameReducer`). This is the single source of truth for scoring, bust, undo, and turn-advance logic. Keep it pure (no side effects) so it stays easy to reason about and test.
- `src/screens/` — one component per app phase (`ModeSelectScreen`, `PlayerSetupScreen`, `GameBoardScreen`). `App.jsx` switches between them based on `state.phase`.
- `src/components/` — reusable UI pieces (`NumberPad`, `PlayerCard`).

## Key decisions (don't relitigate without asking the user)

- **No double-out enforcement** — hitting exactly 0 wins regardless of multiplier.
- **Bust = revert to score at start of turn**, not the previous dart's score. Turn ends immediately on bust.
- **Undo is scoped to the current turn only** — can't undo into a previous player's turn.
- Always exactly **3 darts per turn** (no early-finish button).
- Multiplier (Double/Triple) is a toggle that applies to the *next* dart only, then resets to single.
- **OUT** button = a scoreless dart, ignores any selected multiplier.
- **Turn average** = mean of completed-turn point totals, with a bust turn counting as `0` (not excluded). Computed by `turnAverage()` in `gameReducer.js` — don't recompute this ad hoc in components.
- Each player has a `turnHistory` array (`{ total, bust }` per completed turn), appended to only when a turn ends (bust, win, or 3rd dart) — never touched by Undo, since Undo only acts on the in-progress turn.
- No persistence (localStorage) across page refreshes yet — intentionally deferred, not an oversight.

## Backlog / ideas not yet built

- Additional game modes: Cricket, Around the Clock.
- Persist in-progress game to localStorage so a refresh doesn't lose state.
- Cross-game stats/history (past completed games, not just the current game's turn log) — out of scope for v1.
- Reconsider bull (25) multiplier behavior — real darts only allows single/double bull (50 max), no triple. Currently allowed for simplicity.

## Working with this repo

- No test suite yet. Verify changes with `npm run build` (catches syntax/type issues) and manual testing (`npm run dev`) — a headless browser walkthrough of mode select → add players → start → throw a few darts → undo is a fast sanity check.
- Keep `gameReducer.js` logic-only and UI-free; screens/components should only dispatch actions and read state, never compute scoring themselves.
