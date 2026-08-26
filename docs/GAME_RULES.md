# Game Rules

## Modes

- **301** and **501** (countdown family): each player starts at the mode's score and counts down to exactly 0. No double-out requirement — reaching exactly 0 with any throw wins, regardless of multiplier.
- **Around the World** (progression family): each player has a **target** they need to hit next, starting at **1** and progressing through 2, 3, ... 20, then **Bull (25)**. Hitting the current target (any multiplier — see below) advances to the next one; missing does nothing. First player to hit Bull wins.

## Turns

- Each turn is exactly 3 darts.
- Countdown modes: after the 3rd dart (or a bust), the turn automatically passes to the next player.
- Around the World: after the 3rd dart, the turn passes to the next player — there's no bust equivalent, a miss just doesn't advance you.
- In both families, a **win ends the game immediately**, even mid-turn — the remaining darts of that turn are never thrown.

## Scoring input (countdown modes)

- Tap **Double** or **Triple** to set the multiplier for the *next* dart only — it resets to single after every throw.
- Tap a number (1–20, or 25 for bull) to register that dart's score (`segment * multiplier`).
- Tap **OUT** to register a scoreless dart (miss), ignoring any selected multiplier.

## Scoring input (Around the World)

- The Double/Triple row is hidden for this mode — **any multiplier hitting the current target advances you by exactly one step**, the multiplier itself has no extra effect. (Some house rules instead skip ahead 2/3 steps on a double/triple; this app doesn't implement that variant — see Known simplifications.)
- Tap the number you hit; if it matches your current target, you advance. Anything else (wrong number, or **OUT**) is just a miss.

## Bust rule (countdown modes only)

- If a throw would take a player's score below 0, it's a **bust**:
  - The player's score reverts to what it was at the **start of the turn** (not the previous dart).
  - The turn ends immediately, even if fewer than 3 darts were thrown.
- Landing on exactly 1 is *not* a bust (no double-out enforcement in this version).

## Undo

- Undo removes the most recent dart **within the current turn only**.
- Once a turn has ended (3 darts thrown, a bust, or a win), previous turns cannot be undone.
- Around the World: undo recomputes your target by replaying the turn's remaining darts from the target you had at the start of the turn.

## Turn history & average

- Each player's card always shows their **last completed turn** inline — the 3 individual darts thrown plus that turn's total (or `BUST`) — no need to expand anything to see the previous round.
- A "Full history (N) ▼" toggle appears once a player has completed more than one turn, expanding a scrollable log of every turn (same per-dart detail).
- A **turn average** is shown per player: the mean of all completed turn totals, where a bust turn counts as `0` points. Shown as `—` until the player has completed at least one turn.
  - In Around the World, a turn's "total" is how many of its 3 darts hit the target (0–3), so the average reads as "hits per turn" rather than points.
- The in-progress turn's 3 dart slots (shown only for the active player) are separate from this — they show live, per-dart detail for the turn in progress; the "last turn" row updates once that turn ends.

## Leaving a game

- **Player Setup → Mode Select**: a "← Back" button lets you pick a different mode after all — already-typed player names are kept, not cleared.
- **Quitting an active game**: a "Quit Game" button on the Game Board abandons the current game and returns to Mode Select. It requires a confirmation step ("Quit this game?") since it discards the in-progress scores. This only clears the *current game* — completed games already recorded in History are untouched (they're stored under a separate key; quitting never adds one either, since only a win gets logged).

## Known simplifications (v1)

- Bull (25) can be doubled/tripled like any other number in countdown modes (real bullseye is 25/50 only, no triple). Revisit if this bothers anyone at the table.
- No checkout/double-out enforcement in countdown modes.
- Around the World always advances by one step per hit, regardless of multiplier, and always ends on Bull — the double/triple-skips-ahead house rule variant isn't implemented.
- No Cricket mode yet.
