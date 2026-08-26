# Design & Layout

Reference screenshot: [`assets/DartScreenLayout.jpg`](assets/DartScreenLayout.jpg) — inspired the game-board layout (dark theme, per-turn dart slots, multiplier row above a number grid, undo pinned at the bottom of the pad).

## Screen flow

```
Mode Select  →  Player Setup  →  Game Board  →  Game Over
   (301/501)     (add names)     (scoring)      (rematch / new game)
```

## Mode Select

- App title + a 2-column grid of mode buttons (301, 501). More modes (Cricket, Around the Clock) can be added to `src/game/modes.js` later.

## Player Setup

- Text input + "Add" button (Enter key also submits).
- List of added players with a remove (✕) button per row.
- "Start Game" button, disabled until at least one player is added.

## Game Board

- Turn banner: `"<Name>'s turn"`.
- A card per player showing name, turn average, and running score. The active player's card additionally shows a 3-slot row for the current turn's darts (e.g. `T20`, `5`, `OUT`).
- Every card always shows its **last completed turn** inline (individual darts + total/`BUST`) — no drop-down needed to see the previous round.
- Once a player has more than one completed turn, a "Full history (N) ▼" toggle appears, revealing a scrollable log of every turn further back.
- Number pad, pinned near the bottom:
  - Multiplier row: **Double** / **Triple** toggle buttons (tap again to deselect).
  - 5-column grid: 1–20, then 25 (bull), OUT, and Undo (spans remaining width).
- Mobile-first, single-column layout — designed to be passed around the table on one phone.

## Game Over

- Winner announcement + **Rematch** (same players/mode, scores reset) or **New Game** (back to mode select) buttons.

## Visual style

- Dark theme, high-contrast tabular scores, minimal chrome — matches the reference screenshot rather than a generic light UI kit.
- Palette and component styles live in `src/index.css` (global tokens) and `src/App.css` (screen/component styles).
