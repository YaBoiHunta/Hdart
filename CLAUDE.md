# CLAUDE.md

Project context for AI-assisted development on Downtime Darts.

## What this is

A simple dart scoreboard web app for the user and friends to track scores while playing darts in person. One phone/device is passed around the table; players tap the segment they hit after each dart instead of doing mental math.

## Stack & constraints

- React + Vite + **TypeScript** (strict mode), plain CSS — no UI framework, no backend, no database.
- Must stay deployable for free on **GitHub Pages** (static build only). Don't introduce anything that needs a server (no API routes, no server-side rendering).
- Repo is `YaBoiHunta/Hdart`, default branch `master` — `vite.config.ts` sets `base: '/Hdart/'` to match the GitHub Pages project-site URL (`https://yaboihunta.github.io/Hdart/`). If the repo is ever renamed, update `base` to match, and vice versa.
- Deploy is automatic via `.github/workflows/deploy.yml` on push to `master`. Requires repo **Settings → Pages → Source: GitHub Actions** — if it's set to "Deploy from a branch" instead, Pages serves the raw unbuilt source and the site 404s on `/src/main.tsx` and other dev-only paths.

## Design source of truth

- `docs/DESIGN.md` — screen flow and layout decisions.
- `docs/GAME_RULES.md` — exact scoring/bust/undo rules implemented.
- `docs/assets/DartScreenLayout.jpg` — the reference screenshot the game-board UI is modeled after.

Read these before changing game logic or layout — they capture decisions made with the user, not just what the code happens to do.

## Architecture

- `src/game/types.ts` — the shared domain types. `Player` and `Mode` are **discriminated unions** on `family`/shape (`CountdownPlayer` has `score`, `ProgressionPlayer` has `targetIndex`; narrow between them with the exported `isCountdownPlayer`/`isProgressionPlayer` type guards rather than casting). `Action` is a discriminated union of every reducer action. `PHASES`/`Phase` also live here and are re-exported from `gameReducer.ts` for backward-compatible imports.
- `src/game/modes.ts` — game mode definitions, each tagged with a `family`: `'countdown'` (301, 501 — a `score` that counts down to 0) or `'progression'` (Around the World — a `sequence` array and a `targetIndex` into it). Add new modes here; a genuinely new scoring model (e.g. Cricket) would need a third family.
- `src/game/gameReducer.ts` — all game state and rules live in one `useReducer` reducer (`gameReducer`). This is the single source of truth for scoring, bust, undo, and turn-advance logic. Keep it pure (no side effects) so it stays easy to reason about and test.
  - `THROW_DART`/`UNDO`/`START_GAME`/`REMATCH` each branch on `mode.family`. Turn-management mechanics that don't depend on the scoring model — 3-darts-per-turn, `advanceTurn`, undo-scoped-to-current-turn, `turnHistory`/`turnAverage` — are shared across families unchanged. Only two families exist, so this is plain branching, not a plugin architecture; don't generalize further until a third family actually needs it.
  - `isGameOver`/`getStandings`/`placementOf` are the derived-state helpers for placement/standings (see Key decisions below) — screens read these rather than re-deriving "is the game over" or a player's placement themselves.
  - State-shape additions for new families must be **additive only** (new optional fields alongside existing ones, e.g. `targetIndex` next to `score`), never renames — real persisted game state already lives in players' `localStorage` (see `persistence.ts` below), and a rename would break an in-progress game someone has saved.
- `src/screens/` — one component per app phase (`ModeSelectScreen`, `PlayerSetupScreen`, `GameBoardScreen`, plus `HistoryScreen` as a separate local view — see below). `App.tsx` switches between them based on `state.phase`.
- `src/components/` — reusable UI pieces (`NumberPad`, `PlayerCard`).
- `src/game/persistence.ts` — thin localStorage read/write helpers (`loadPersistedState`/`savePersistedState`), wrapped in try/catch since storage can be unavailable (private browsing, quota). `loadPersistedState()` intentionally returns `unknown` — `App.tsx`'s `isUsableState()` type guard is what narrows it to a trustworthy `GameState` before use. `App.tsx` hydrates via `useReducer`'s lazy-init argument and saves on every state change via a `useEffect`.
- `src/game/history.ts` — a *separate* localStorage-backed log (`hdart:history`, distinct key from `persistence.ts`'s in-progress-game key) of completed games, capped at 100 entries. `buildGameSummary(state)` derives a `GameHistoryEntry` (`{finishedAt, modeId, modeLabel, players: [{name, won, average, turns}], highestRound}`) from game state, reusing the existing `turnAverage()` for the per-player average and adding one small new aggregation of its own — a `max` over every player's `turnHistory` totals — for `highestRound` (countdown-mode games only; `null` for Around the World, see Key decisions below). `appendGameResult()` writes it. `loadHistory()` validates each stored entry with `isGameHistoryEntry()` before trusting it (mirrors `persistence.ts`'s `isUsableState()`) and silently drops anything malformed, rather than casting the raw parsed JSON — a corrupted or future-incompatible entry can't crash `HistoryScreen`; it also tolerates entries saved before `highestRound` existed (missing, not malformed) by normalizing them to `null`. Recorded by a `useEffect` in `App.tsx` gated on `isGameOver(state) && !state.historyRecorded` — `historyRecorded` lives in persisted state (not a `useRef`) so it survives a refresh and still fires exactly once per completed game. This history is local to whichever device/browser is running the site — it does not sync across different players' phones (that would require a real backend, which is explicitly out of scope — see Stack & constraints above).

## Key decisions (don't relitigate without asking the user)

- **No double-out enforcement** — hitting exactly 0 wins regardless of multiplier.
- **Bust = revert to score at start of turn**, not the previous dart's score. Turn ends immediately on bust.
- **Undo is scoped to the current turn only** — can't undo into a previous player's turn.
- Always exactly **3 darts per turn** (no early-finish button).
- Multiplier (Double/Triple) is a toggle that applies to the *next* dart only, then resets to single.
- **OUT** button = a scoreless dart, ignores any selected multiplier.
- **Turn average** = mean of completed-turn point totals, with a bust turn counting as `0` (not excluded). Computed by `turnAverage()` in `gameReducer.ts` — don't recompute this ad hoc in components.
- Each player has a `turnHistory` array (`{ total, bust }` per completed turn), appended to only when a turn ends (bust, win, or 3rd dart) — never touched by Undo, since Undo only acts on the in-progress turn.
- **The full game state persists to localStorage** on every change (any phase — mode select, player setup, or an in-progress game) and rehydrates on load, so a refresh or closed tab doesn't lose progress. Corrupted/unrecognized stored data falls back to `initialState` rather than crashing (see `isUsableState` in `App.tsx`). Restoring persisted players calls `ensurePlayerIdCounterAbove()` so a newly-added player after reload can't reuse an id already held by a restored player (the id counter is an in-memory module variable that would otherwise reset to 1 on reload).
- **Around the World (progression family)**: any multiplier hitting the current target advances by exactly one step — multipliers don't skip ahead. The Double/Triple row is hidden entirely for this mode (`NumberPad` checks `mode.family`). Sequence is 1→20→Bull; hitting Bull wins. A turn's `turnHistory` "total" is reused to mean "hits this turn" (0–3) rather than points, which is why the existing average/last-turn/full-history UI and `history.ts` need no changes to support this mode. If the actual house rule played differs (e.g. double/triple skip ahead), that's a small change to `modes.ts`'s `sequence` handling — ask before changing, since it was an explicit assumption.
- **Back navigation from Player Setup → Mode Select** (`BACK_TO_MODE_SELECT` action), for the "picked the wrong mode" case — preserves already-typed players rather than clearing them.
- **Quit Game** (Game Board, active play only) requires an inline confirmation ("Quit this game?" — a custom row, not `window.confirm()`, to match the app's own styling) before dispatching. It intentionally **reuses the existing `NEW_GAME` action** rather than adding a new one — `NEW_GAME` already resets to `{...initialState, phase: MODE_SELECT}`, which is exactly "abandon this game." The persisted `hdart:game-state` snapshot is overwritten with that fresh state automatically via the existing save-on-every-change effect — no separate clearing logic needed. This is unrelated to `hdart:history` (a different key, only appended to on an actual win) — quitting never touches completed-game history in either direction.
- **Continue-to-place with 3+ players**: finishing (hitting 0, or completing the Around the World sequence) removes that player from turn rotation via `GameState.finishOrder` (an array of player ids in finish order) rather than ending the game outright — remaining players keep playing until only one is left, who takes last place automatically. `isGameOver(state)` (`gameReducer.ts`) is the single source of truth for "is the game actually over" — true once `finishOrder.length > 0` and at most one player remains unfinished. This makes 1- and 2-player games behave exactly as before (over on the first win). `getStandings()`/`placementOf()` (also `gameReducer.ts`) derive the final ordering and each player's 1-indexed placement for the UI — screens must call these rather than re-deriving placement themselves. History is recorded (`App.tsx`) only once `isGameOver`, not on the first `winnerId` — critical, since with 3+ players `winnerId` is now set well before the game actually ends.
- **Bullseye (50) button**: a dedicated always-50 button on the number pad (countdown modes only — hidden for Around the World, whose sequence never contains 50). Unlike every other number, its multiplier is forced to `1` regardless of the Double/Triple toggle (`throwDartCountdown` in `gameReducer.ts`), so it always scores exactly 50. The existing `25` (bull) button is unchanged and still respects the toggle (and is still what Around the World's sequence uses for its Bull target).
- **Highest scoring round in History**: `GameHistoryEntry.highestRound` (`{total, playerName} | null`) records the single best 3-dart turn total across all players in that game, computed in `buildGameSummary()` (`history.ts`). Countdown-mode games only — `null` for Around the World, since that mode's `turnHistory` "total" means hits (0–3), not points, and would be meaningless as a "highest round".

## Backlog / ideas not yet built

- Additional game modes: Cricket (would need a third `mode.family`, since it's neither a countdown nor a simple progression).
- The `25` (bull) button can still be tripled in countdown modes, which isn't possible on a real board (real bullseye is 25/50 only). The dedicated `50` (Bullseye) button covers the common double-bull case, but `25` itself is unchanged — revisit if this bothers anyone at the table.
- Richer cross-game stats (checkout %, longest streak, etc.) beyond the simple per-game history log and highest-round stat that now exist.

## Working with this repo

- Run `npm test` before considering any change to `gameReducer.ts` or the game-board UI done. Test files:
  - `src/game/gameReducer.test.ts` — pure reducer/logic tests (scoring math, bust, undo, win, turn history, averages, and the Around the World progression family). Add new cases here for any new action, rule, or mode family. Uses generic `dispatch<T>`/`throwDart<T>`/etc. helpers plus `CountdownGameState`/`ProgressionGameState` type aliases (`Omit<GameState, 'players'> & {players: X[]}` — an intersection without the `Omit` would intersect the `players` array types instead of overriding, which silently breaks narrowing) so assertions like `.score`/`.targetIndex` type-check without casts.
  - `src/game/types.test.ts` — the `isCountdownPlayer`/`isProgressionPlayer` type guards.
  - `src/game/modes.test.ts` — `GAME_MODES`/`getModeById`.
  - `src/game/history.test.ts` — the completed-game history log (load/append/cap-at-100, corrupted-data fallback, summary building).
  - `src/App.test.tsx` — click-driven integration tests (React Testing Library + user-event) covering the actual buttons: mode select, player setup, multiplier toggle, number pad, undo, turn advance, bust, win, turn history display, persistence, game history. New game modes or UI features should get a test here too.
  - `npm run test:watch` for a live-reloading loop while iterating.
  - Test config lives in `vitest.config.ts`, kept separate from `vite.config.ts` on purpose — the latter controls the GitHub Pages `base` path and shouldn't carry test-only risk.
- Run `npm run typecheck` (`tsc -b --noEmit`) for a fast type-only check while iterating — `npm run build` also runs this (`tsc -b && vite build`) so a type error fails the build, and CI (`.github/workflows/test.yml`) runs it before tests too. `strict: true` is on in both `tsconfig.app.json` and `tsconfig.node.json` — don't loosen it to silence an error; fix the actual type.
- Also verify with manual testing (`npm run dev`) for anything visual the test suite doesn't cover.
- Keep `gameReducer.ts` logic-only and UI-free; screens/components should only dispatch actions and read state, never compute scoring themselves.
- New state-shape fields must be **additive only**, never renames — see the persistence note above.
