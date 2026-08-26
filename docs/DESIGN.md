# Design & Layout

Reference screenshot: [`assets/DartScreenLayout.jpg`](assets/DartScreenLayout.jpg) — inspired the game-board layout (dark theme, per-turn dart slots, multiplier row above a number grid, undo pinned at the bottom of the pad).

## Screen flow

```
Mode Select              →  Player Setup  →  Game Board  →  Game Over
(301/501/Around the World)  (add names)     (scoring)      (rematch / new game)
```

## Mode Select

- App title + a grid of mode buttons (301, 501, Around the World), sized to wrap gracefully as more modes are added to `src/game/modes.ts` (e.g. a future Cricket).

## Player Setup

- A "← Back" button (shared `.screen-header` layout with History's) returns to Mode Select — for picking the wrong mode by mistake. Already-typed players are **kept**, not cleared, so going back just to fix the mode doesn't cost re-entering names.
- Text input + "Add" button (Enter key also submits).
- List of added players with a remove (✕) button per row.
- "Start Game" button, disabled until at least one player is added.

## Game Board

- A small "Quit Game" button above the turn banner. Tapping it swaps in an inline confirmation row ("Quit this game?" + Cancel/"Yes, quit") rather than a native browser confirm dialog, to stay visually consistent with the rest of the app. Confirming abandons the game and returns to Mode Select.
- Turn banner: `"<Name>'s turn"`.
- A card per player showing name, turn average, and a running status number — a countdown score for 301/501, or a labeled **Target** (the next number they need to hit) for Around the World. The active player's card additionally shows a 3-slot row for the current turn's darts (e.g. `T20`, `5`, `OUT`).
- Every card always shows its **last completed turn** inline (individual darts + total/`BUST`) — no drop-down needed to see the previous round.
- Once a player has more than one completed turn, a "Full history (N) ▼" toggle appears, revealing a scrollable log of every turn further back.
- Number pad, pinned near the bottom:
  - Multiplier row: **Double** / **Triple** toggle buttons (tap again to deselect) — only shown for countdown modes; hidden entirely for Around the World, where a multiplier has no effect.
  - 5-column grid: 1–20, then 25 (bull), OUT, and Undo (spans remaining width) — same grid for every mode.
- Mobile-first, single-column layout — designed to be passed around the table on one phone.

## Game Over

- Winner announcement + **Rematch** (same players/mode, scores reset) or **New Game** (back to mode select) buttons.

## Visual style

- Dark theme, high-contrast tabular scores, minimal chrome — matches the reference screenshot rather than a generic light UI kit.
- Palette and component styles live in `src/index.css` (global tokens) and `src/App.css` (screen/component styles).
