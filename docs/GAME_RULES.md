# Game Rules

## Modes

- **301** and **501**: each player starts at the mode's score and counts down to exactly 0.
- No double-out requirement — reaching exactly 0 with any throw wins, regardless of multiplier.

## Turns

- Each turn is exactly 3 darts.
- After the 3rd dart (or a bust), the turn automatically passes to the next player.

## Scoring input

- Tap **Double** or **Triple** to set the multiplier for the *next* dart only — it resets to single after every throw.
- Tap a number (1–20, or 25 for bull) to register that dart's score (`segment * multiplier`).
- Tap **OUT** to register a scoreless dart (miss), ignoring any selected multiplier.

## Bust rule

- If a throw would take a player's score below 0, it's a **bust**:
  - The player's score reverts to what it was at the **start of the turn** (not the previous dart).
  - The turn ends immediately, even if fewer than 3 darts were thrown.
- Landing on exactly 1 is *not* a bust (no double-out enforcement in this version).

## Undo

- Undo removes the most recent dart **within the current turn only**.
- Once a turn has ended (3 darts thrown, a bust, or a win), previous turns cannot be undone.

## Turn history & average

- Each player's card always shows their **last completed turn** inline — the 3 individual darts thrown plus that turn's total (or `BUST`) — no need to expand anything to see the previous round.
- A "Full history (N) ▼" toggle appears once a player has completed more than one turn, expanding a scrollable log of every turn (same per-dart detail).
- A **turn average** is shown per player: the mean of all completed turn totals, where a bust turn counts as `0` points. Shown as `—` until the player has completed at least one turn.
- The in-progress turn's 3 dart slots (shown only for the active player) are separate from this — they show live, per-dart detail for the turn in progress; the "last turn" row updates once that turn ends.

## Known simplifications (v1)

- Bull (25) can be doubled/tripled like any other number (real bullseye is 25/50 only, no triple). Revisit if this bothers anyone at the table.
- No checkout/double-out enforcement.
- No stats, history, or persistence across page refreshes yet.
- No Cricket or Around the Clock modes yet (only 301/501).
