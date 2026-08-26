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
- `src/screens/` — one component per app phase (`ModeSelectScreen`, `PlayerSetupScreen`, `GameBoardScreen`, plus `HistoryScreen` as a separate local view — see below). `App.jsx` switches between them based on `state.phase`.
- `src/components/` — reusable UI pieces (`NumberPad`, `PlayerCard`).
- `src/game/persistence.js` — thin localStorage read/write helpers (`loadPersistedState`/`savePersistedState`), wrapped in try/catch since storage can be unavailable (private browsing, quota). `App.jsx` hydrates via `useReducer`'s lazy-init argument and saves on every state change via a `useEffect`.
- `src/game/history.js` — a *separate* localStorage-backed log (`hdart:history`, distinct key from `persistence.js`'s in-progress-game key) of completed games, capped at 100 entries. `buildGameSummary(state)` derives a `{finishedAt, modeId, modeLabel, players: [{name, won, average, turns}]}` entry from game state using the existing `turnAverage()` — no new scoring math. `appendGameResult()` writes it. Recorded by a `useEffect` in `App.jsx` watching `state.winnerId` (guarded by a `useRef` so it fires exactly once per win, not per re-render). This history is local to whichever device/browser is running the site — it does not sync across different players' phones (that would require a real backend, which is explicitly out of scope — see Stack & constraints above).

## Key decisions (don't relitigate without asking the user)

- **No double-out enforcement** — hitting exactly 0 wins regardless of multiplier.
- **Bust = revert to score at start of turn**, not the previous dart's score. Turn ends immediately on bust.
- **Undo is scoped to the current turn only** — can't undo into a previous player's turn.
- Always exactly **3 darts per turn** (no early-finish button).
- Multiplier (Double/Triple) is a toggle that applies to the *next* dart only, then resets to single.
- **OUT** button = a scoreless dart, ignores any selected multiplier.
- **Turn average** = mean of completed-turn point totals, with a bust turn counting as `0` (not excluded). Computed by `turnAverage()` in `gameReducer.js` — don't recompute this ad hoc in components.
- Each player has a `turnHistory` array (`{ total, bust }` per completed turn), appended to only when a turn ends (bust, win, or 3rd dart) — never touched by Undo, since Undo only acts on the in-progress turn.
- **The full game state persists to localStorage** on every change (any phase — mode select, player setup, or an in-progress game) and rehydrates on load, so a refresh or closed tab doesn't lose progress. Corrupted/unrecognized stored data falls back to `initialState` rather than crashing (see `isUsableState` in `App.jsx`). Restoring persisted players calls `ensurePlayerIdCounterAbove()` so a newly-added player after reload can't reuse an id already held by a restored player (the id counter is an in-memory module variable that would otherwise reset to 1 on reload).

## Backlog / ideas not yet built

- Additional game modes: Cricket, Around the Clock.
- Reconsider bull (25) multiplier behavior — real darts only allows single/double bull (50 max), no triple. Currently allowed for simplicity.
- Richer cross-game stats (checkout %, best turn ever, etc.) beyond the simple per-game history log that now exists.

## Working with this repo

- Run `npm test` before considering any change to `gameReducer.js` or the game-board UI done. Test files:
  - `src/game/gameReducer.test.js` — pure reducer/logic tests (scoring math, bust, undo, win, turn history, averages). Add new cases here for any new action or rule.
  - `src/game/history.test.js` — the completed-game history log (load/append/cap-at-100, corrupted-data fallback, summary building).
  - `src/App.test.jsx` — click-driven integration tests (React Testing Library + user-event) covering the actual buttons: mode select, player setup, multiplier toggle, number pad, undo, turn advance, bust, win, turn history display, persistence, game history. New game modes or UI features should get a test here too.
  - `npm run test:watch` for a live-reloading loop while iterating.
  - Test config lives in `vitest.config.js`, kept separate from `vite.config.js` on purpose — the latter controls the GitHub Pages `base` path and shouldn't carry test-only risk.
- Also verify with `npm run build` (catches syntax/type issues) and manual testing (`npm run dev`) for anything visual the test suite doesn't cover.
- Keep `gameReducer.js` logic-only and UI-free; screens/components should only dispatch actions and read state, never compute scoring themselves.
