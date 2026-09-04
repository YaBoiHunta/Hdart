import { describe, it, expect } from 'vitest'
import {
  gameReducer,
  initialState,
  turnAverage,
  PHASES,
  ensurePlayerIdCounterAbove,
  isGameOver,
  getStandings,
  placementOf,
} from './gameReducer'
import type {
  Action,
  CountdownPlayer,
  GameState,
  Multiplier,
  ProgressionPlayer,
  ThrowSegment,
} from './types'

type CountdownGameState = Omit<GameState, 'players'> & { players: CountdownPlayer[] }
type ProgressionGameState = Omit<GameState, 'players'> & { players: ProgressionPlayer[] }

function dispatch<T extends GameState>(state: T, action: Action): T {
  return gameReducer(state, action) as T
}

function selectMode(state: GameState, modeId: string): GameState {
  return dispatch(state, { type: 'SELECT_MODE', modeId })
}

function addPlayer<T extends GameState>(state: T, name: string): T {
  return dispatch(state, { type: 'ADD_PLAYER', name })
}

function startGame(state: GameState): GameState {
  return dispatch(state, { type: 'START_GAME' })
}

function throwDart<T extends GameState>(state: T, segment: ThrowSegment): T {
  return dispatch(state, { type: 'THROW_DART', segment })
}

function setMultiplier<T extends GameState>(state: T, multiplier: Multiplier): T {
  return dispatch(state, { type: 'SET_MULTIPLIER', multiplier })
}

function undo<T extends GameState>(state: T): T {
  return dispatch(state, { type: 'UNDO' })
}

function newGameAt501WithPlayers(...names: string[]): CountdownGameState {
  let state = selectMode(initialState, '501')
  for (const name of names) state = addPlayer(state, name)
  return startGame(state) as CountdownGameState
}

function newAroundTheWorldGameWithPlayers(...names: string[]): ProgressionGameState {
  let state = selectMode(initialState, 'around-the-world')
  for (const name of names) state = addPlayer(state, name)
  return startGame(state) as ProgressionGameState
}

describe('setup', () => {
  it('SELECT_MODE moves to player setup with the chosen mode', () => {
    const state = selectMode(initialState, '501')
    expect(state.phase).toBe(PHASES.PLAYER_SETUP)
    expect(state.modeId).toBe('501')
  })

  it('ADD_PLAYER trims whitespace', () => {
    let state = selectMode(initialState, '501')
    state = addPlayer(state, '  Hunter  ')
    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Hunter')
  })

  it('ADD_PLAYER ignores empty/whitespace-only names', () => {
    let state = selectMode(initialState, '501')
    state = addPlayer(state, '   ')
    expect(state.players).toHaveLength(0)
  })

  it('REMOVE_PLAYER removes only the matching player', () => {
    let state = selectMode(initialState, '501')
    state = addPlayer(state, 'Hunter')
    state = addPlayer(state, 'Friend')
    const [hunter] = state.players
    state = dispatch(state, { type: 'REMOVE_PLAYER', playerId: hunter.id })
    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Friend')
  })

  it('BACK_TO_MODE_SELECT returns to mode select without losing already-added players', () => {
    let state = selectMode(initialState, '501')
    state = addPlayer(state, 'Hunter')
    state = addPlayer(state, 'Friend')
    state = dispatch(state, { type: 'BACK_TO_MODE_SELECT' })
    expect(state.phase).toBe(PHASES.MODE_SELECT)
    expect(state.modeId).toBeNull()
    expect(state.players.map((p) => p.name)).toEqual(['Hunter', 'Friend'])
  })

  it('picking a different mode after going back keeps those players for the new mode', () => {
    let state = selectMode(initialState, '501')
    state = addPlayer(state, 'Hunter')
    state = dispatch(state, { type: 'BACK_TO_MODE_SELECT' })
    state = selectMode(state, 'around-the-world')
    expect(state.phase).toBe(PHASES.PLAYER_SETUP)
    expect(state.modeId).toBe('around-the-world')
    expect(state.players.map((p) => p.name)).toEqual(['Hunter'])
  })

  it('START_GAME requires a mode and at least one player', () => {
    const noMode = startGame(addPlayer(initialState, 'Hunter'))
    expect(noMode.phase).toBe(PHASES.MODE_SELECT)

    const noPlayers = startGame(selectMode(initialState, '501'))
    expect(noPlayers.phase).toBe(PHASES.PLAYER_SETUP)
  })

  it('START_GAME sets every player to the mode starting score', () => {
    const state = newGameAt501WithPlayers('Hunter', 'Friend')
    expect(state.phase).toBe(PHASES.GAME)
    expect(state.players.map((p) => p.score)).toEqual([501, 501])
  })
})

describe('throwing darts & scoring math', () => {
  it('a single scores the segment value', () => {
    const state = throwDart(newGameAt501WithPlayers('Hunter'), 20)
    expect(state.players[0].score).toBe(481)
  })

  it('a double scores segment * 2', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 2)
    state = throwDart(state, 20)
    expect(state.players[0].score).toBe(461)
  })

  it('a triple scores segment * 3', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 3)
    state = throwDart(state, 20)
    expect(state.players[0].score).toBe(441)
  })

  it('OUT always scores 0, even with a multiplier selected', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 3)
    state = throwDart(state, 'OUT')
    expect(state.players[0].score).toBe(501)
  })

  it('multiplier resets to single after every throw', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 3)
    state = throwDart(state, 20)
    expect(state.activeMultiplier).toBe(1)
  })

  it('SET_MULTIPLIER toggles off when pressed twice', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 2)
    state = setMultiplier(state, 2)
    expect(state.activeMultiplier).toBe(1)
  })

  it('bullseye (50) always scores exactly 50, ignoring an active multiplier', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 3)
    state = throwDart(state, 50)
    expect(state.players[0].score).toBe(451)
    expect(state.activeMultiplier).toBe(1)
  })

  it('bullseye (50) is recorded with multiplier 1 regardless of the toggle', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = setMultiplier(state, 2)
    state = throwDart(state, 50)
    const [dart] = state.currentTurn.throws
    expect(dart).toEqual({ segment: 50, multiplier: 1, value: 50 })
  })
})

describe('turn progression', () => {
  it('advances to the next player after the 3rd dart', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(state, 5)
    state = throwDart(state, 5)
    state = throwDart(state, 5)
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.currentTurn.throws).toHaveLength(0)
    expect(state.currentTurn.startScore).toBe(501)
  })

  it('records a turnHistory entry with the throws and total', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = throwDart(state, 20)
    state = throwDart(state, 19)
    state = throwDart(state, 18)
    const [entry] = state.players[0].turnHistory
    expect(entry.bust).toBe(false)
    expect(entry.total).toBe(57)
    expect(entry.throws).toHaveLength(3)
  })

  it('wraps the player index around with 3 players', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C')
    const finishTurn = (s: CountdownGameState) => throwDart(throwDart(throwDart(s, 1), 1), 1)
    state = finishTurn(state)
    expect(state.currentPlayerIndex).toBe(1)
    state = finishTurn(state)
    expect(state.currentPlayerIndex).toBe(2)
    state = finishTurn(state)
    expect(state.currentPlayerIndex).toBe(0)
  })
})

describe('bust', () => {
  it('reverts to the score at the start of the turn, not the previous dart', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = throwDart(state, 5) // 501 -> 496, turn start stays 501
    expect(state.currentTurn.startScore).toBe(501)
    state = { ...state, players: [{ ...state.players[0], score: 5 }] }
    state = throwDart(state, 20) // 5 - 20 = -15 -> bust, revert to turn start (501), not 5 or 496
    expect(state.players[0].score).toBe(501)
  })

  it('ends the turn immediately even before the 3rd dart', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = { ...state, players: [{ ...state.players[0], score: 5 }, state.players[1]] }
    state = throwDart(state, 20) // dart 1 of the turn -> bust
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.currentTurn.throws).toHaveLength(0)
  })

  it('records the turnHistory entry as a bust with total 0', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = { ...state, players: [{ ...state.players[0], score: 5 }] }
    state = throwDart(state, 20)
    const [entry] = state.players[0].turnHistory
    expect(entry.bust).toBe(true)
    expect(entry.total).toBe(0)
    expect(entry.throws).toHaveLength(1)
  })
})

describe('win', () => {
  it('sets winnerId when a score hits exactly 0', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = { ...state, players: [{ ...state.players[0], score: 20 }] }
    const winningId = state.players[0].id
    state = throwDart(state, 20)
    expect(state.winnerId).toBe(winningId)
    expect(state.players[0].score).toBe(0)
  })

  it('does not advance the turn on a win', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = {
      ...state,
      players: [{ ...state.players[0], score: 20 }, state.players[1]],
    }
    state = throwDart(state, 20)
    expect(state.currentPlayerIndex).toBe(0)
  })

  it('ignores further THROW_DART actions once there is a winner', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = { ...state, players: [{ ...state.players[0], score: 20 }] }
    state = throwDart(state, 20)
    const afterWin = state
    state = throwDart(state, 5)
    expect(state).toEqual(afterWin)
  })
})

describe('multi-player continue-to-place', () => {
  it('3 players: removes the finisher from rotation and continues to full placement', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C')
    const [a, b, c] = state.players
    state = { ...state, players: [{ ...a, score: 20 }, { ...b, score: 20 }, c] }

    // A wins (1st) -> game must continue, turn skips straight to B.
    state = throwDart(state, 20)
    expect(state.finishOrder).toEqual([a.id])
    expect(isGameOver(state)).toBe(false)
    expect(state.currentPlayerIndex).toBe(1)
    expect(placementOf(state, a.id)).toBe(1)
    expect(placementOf(state, b.id)).toBeNull()

    // B wins (2nd) -> only C remains, game ends automatically without C throwing.
    state = throwDart(state, 20)
    expect(state.finishOrder).toEqual([a.id, b.id])
    expect(isGameOver(state)).toBe(true)
    expect(placementOf(state, a.id)).toBe(1)
    expect(placementOf(state, b.id)).toBe(2)
    expect(placementOf(state, c.id)).toBe(3)
    expect(getStandings(state).map((p) => p.id)).toEqual([a.id, b.id, c.id])
  })

  it('4 players: turn rotation skips over already-finished players', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C', 'D')
    const [a, b, c, d] = state.players
    const finishTurnNoScore = (s: CountdownGameState) =>
      throwDart(throwDart(throwDart(s, 'OUT'), 'OUT'), 'OUT')

    // A wins immediately.
    state = { ...state, players: [{ ...a, score: 20 }, b, c, d] }
    state = throwDart(state, 20)
    expect(state.currentPlayerIndex).toBe(1) // B's turn

    // B wins immediately.
    state = { ...state, players: [state.players[0], { ...state.players[1], score: 20 }, c, d] }
    state = throwDart(state, 20)
    expect(state.currentPlayerIndex).toBe(2) // C's turn
    expect(state.finishOrder).toEqual([a.id, b.id])

    // C takes a normal (non-winning) turn.
    state = finishTurnNoScore(state)
    expect(state.currentPlayerIndex).toBe(3) // D's turn

    // D takes a normal (non-winning) turn -> rotation must skip finished A
    // and B, landing back on C.
    state = finishTurnNoScore(state)
    expect(state.currentPlayerIndex).toBe(2)

    // C wins (3rd place) -> only D remains, game ends automatically.
    state = {
      ...state,
      players: [
        state.players[0],
        state.players[1],
        { ...state.players[2], score: 20 },
        state.players[3],
      ],
    }
    state = throwDart(state, 20)
    expect(isGameOver(state)).toBe(true)
    expect(state.finishOrder).toEqual([a.id, b.id, c.id])
    expect(placementOf(state, d.id)).toBe(4)
    expect(getStandings(state).map((p) => p.id)).toEqual([a.id, b.id, c.id, d.id])
  })

  it('UNDO reaches back into a finish and un-finishes the player, since the game is still in progress', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C')
    const [a] = state.players
    state = {
      ...state,
      players: [{ ...state.players[0], score: 20 }, state.players[1], state.players[2]],
      currentTurn: { ...state.currentTurn, startScore: 20 },
    }
    state = throwDart(state, 20) // A finishes, game continues onto B
    expect(state.finishOrder).toEqual([a.id])
    expect(state.winnerId).toBe(a.id)

    state = undo(state)

    expect(state.finishOrder).toEqual([])
    expect(state.winnerId).toBeNull()
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0].score).toBe(20)
    expect(state.players[0].turnHistory).toHaveLength(0)
    expect(state.currentTurn.throws).toHaveLength(1)
  })

  it('REMATCH after a placement game resets finishOrder and restores normal rotation', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C')
    state = {
      ...state,
      players: [{ ...state.players[0], score: 20 }, { ...state.players[1], score: 20 }, state.players[2]],
    }
    state = throwDart(state, 20) // A wins
    state = throwDart(state, 20) // B wins, game over
    expect(isGameOver(state)).toBe(true)

    state = dispatch(state, { type: 'REMATCH' })
    expect(state.finishOrder).toEqual([])
    expect(state.winnerId).toBeNull()
    expect(isGameOver(state)).toBe(false)
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players.map((p) => p.score)).toEqual([501, 501, 501])
  })
})

describe('undo', () => {
  it('removes only the most recent dart of the current turn', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = throwDart(state, 20)
    state = throwDart(state, 19)
    state = undo(state)
    expect(state.players[0].score).toBe(481) // only the 20 remains
    expect(state.currentTurn.throws).toHaveLength(1)
  })

  it('is a no-op when the current turn has no throws yet', () => {
    const state = newGameAt501WithPlayers('Hunter')
    const afterUndo = undo(state)
    expect(afterUndo).toEqual(state)
  })

  it('reaches into a previous, already-completed turn while the game is still in progress', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(state, 20)
    state = throwDart(state, 20)
    state = throwDart(state, 20) // Hunter's turn ends (60 points), Friend is now active
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[0].score).toBe(441)

    state = undo(state) // Friend's turn has no throws yet -> reaches back into Hunter's turn

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0].score).toBe(501)
    expect(state.players[0].turnHistory).toHaveLength(0)
    expect(state.currentTurn.throws).toHaveLength(3)
    expect(state.turnOrderLog).toEqual([])

    // Undoing one dart at a time from the reclaimed turn works exactly like
    // same-turn undo, since it's now the current turn again.
    state = undo(state)
    expect(state.players[0].score).toBe(461) // one 20 remains
    expect(state.currentTurn.throws).toHaveLength(2)
  })

  it('cannot reach into a previous turn once the game is over', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = { ...state, players: [{ ...state.players[0], score: 20 }, state.players[1]] }
    state = throwDart(state, 20) // Hunter wins, game over (2-player game)
    expect(isGameOver(state)).toBe(true)
    const afterWin = state

    state = undo(state)

    expect(state).toEqual(afterWin)
  })

  it('chains back across two completed turns', () => {
    let state = newGameAt501WithPlayers('A', 'B')
    state = throwDart(throwDart(throwDart(state, 20), 20), 20) // A: 60 points, B's turn
    state = throwDart(throwDart(throwDart(state, 19), 19), 19) // B: 57 points, A's turn again
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[1].score).toBe(444)

    state = undo(state) // reach back into B's turn -> B's 3 darts are the current turn again
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[1].score).toBe(501)
    expect(state.currentTurn.throws).toHaveLength(3)

    // Drain B's reclaimed turn one dart at a time (same-turn undo), same as
    // any other in-progress turn.
    state = undo(state)
    state = undo(state)
    state = undo(state)
    expect(state.currentTurn.throws).toHaveLength(0)

    state = undo(state) // now reach back into A's turn
    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0].score).toBe(501)
    expect(state.turnOrderLog).toEqual([])
  })

  it('undoing into a bust turn restores the full turn, including the darts thrown before the bust', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = {
      ...state,
      players: [{ ...state.players[0], score: 41 }, state.players[1]],
      currentTurn: { ...state.currentTurn, startScore: 41 },
    }
    state = throwDart(state, 5) // 41 -> 36
    state = throwDart(state, 10) // 36 -> 26
    state = throwDart(state, 30) // busts: 26 - 30 < 0, reverts to startScore (41), Friend's turn
    expect(state.players[0].score).toBe(41)
    expect(state.currentPlayerIndex).toBe(1)

    state = undo(state) // reach back into Hunter's bust turn

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0].score).toBe(41)
    expect(state.currentTurn.throws).toHaveLength(3)
  })

  it('is a no-op crossing into a turn recorded before cross-turn undo shipped (missing startScore)', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(throwDart(throwDart(state, 20), 20), 20) // Hunter's turn ends, Friend is now active
    // Simulate a state persisted by a previous build: strip the new field.
    const legacyEntry = { ...state.players[0].turnHistory[0] }
    delete (legacyEntry as { startScore?: number }).startScore
    state = {
      ...state,
      players: [{ ...state.players[0], turnHistory: [legacyEntry] }, state.players[1]],
    }
    const beforeUndo = state

    state = undo(state)

    expect(state).toEqual(beforeUndo)
  })

  it('is a no-op if the previous player in the turn order log no longer exists', () => {
    // Not reachable through normal play (players are never removed mid-game) —
    // guards a turnOrderLog entry that has gone stale.
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(throwDart(throwDart(state, 20), 20), 20) // Hunter's turn ends, Friend is now active
    state = { ...state, turnOrderLog: [99] } // no player with index 99
    const beforeUndo = state

    state = undo(state)

    expect(state).toEqual(beforeUndo)
  })

  it('is a no-op if the previous player in the turn order log has no completed turns', () => {
    // Not reachable through normal play (a turnOrderLog entry is only added
    // when that player's turn completes) — guards an inconsistent state.
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(throwDart(throwDart(state, 20), 20), 20) // Hunter's turn ends, Friend is now active
    state = {
      ...state,
      players: [{ ...state.players[0], turnHistory: [] }, state.players[1]],
    }
    const beforeUndo = state

    state = undo(state)

    expect(state).toEqual(beforeUndo)
  })

  it('reassigns winnerId to the next-earliest finisher when the winner-in-1st is undone', () => {
    // isGameOver requires at least 2 unfinished players to stay false (so the
    // UNDO dispatch isn't gated before it even reaches this logic) — 4
    // players with 2 finished, 2 still playing.
    let state = newGameAt501WithPlayers('Hunter', 'Friend', 'Buddy', 'Chris')
    const [hunter, friend, buddy, chris] = state.players

    state = {
      ...state,
      players: [
        {
          ...hunter,
          score: 0,
          turnHistory: [
            { throws: [], total: 501, bust: false, startScore: 501, startTargetIndex: 0 },
          ],
        },
        {
          ...friend,
          score: 0,
          turnHistory: [
            { throws: [], total: 501, bust: false, startScore: 501, startTargetIndex: 0 },
          ],
        },
        buddy,
        chris,
      ],
      finishOrder: [hunter.id, friend.id],
      winnerId: hunter.id,
      turnOrderLog: [0], // Hunter (index 0) is the reachable "previous" turn
      currentTurn: { throws: [], startScore: buddy.score, startTargetIndex: 0 },
      currentPlayerIndex: 2,
    }
    expect(isGameOver(state)).toBe(false)

    state = undo(state)

    expect(state.finishOrder).toEqual([friend.id])
    expect(state.winnerId).toBe(friend.id)
    expect(state.players[0].score).toBe(501)
  })

  it('reassigns winnerId to null when undoing the only finisher', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend', 'Buddy')
    const [hunter, friend, buddy] = state.players

    state = {
      ...state,
      players: [
        {
          ...hunter,
          score: 0,
          turnHistory: [
            { throws: [], total: 501, bust: false, startScore: 501, startTargetIndex: 0 },
          ],
        },
        friend,
        buddy,
      ],
      finishOrder: [hunter.id],
      winnerId: hunter.id,
      turnOrderLog: [0],
      currentTurn: { throws: [], startScore: friend.score, startTargetIndex: 0 },
      currentPlayerIndex: 1,
    }
    expect(isGameOver(state)).toBe(false)

    state = undo(state)

    expect(state.finishOrder).toEqual([])
    expect(state.winnerId).toBeNull()
  })

  it('undoing a non-winning finisher removes them from finishOrder without touching winnerId', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend', 'Buddy', 'Chris')
    const [hunter, friend, buddy, chris] = state.players

    state = {
      ...state,
      players: [
        {
          ...hunter,
          score: 0,
          turnHistory: [
            { throws: [], total: 501, bust: false, startScore: 501, startTargetIndex: 0 },
          ],
        },
        {
          ...friend,
          score: 0,
          turnHistory: [
            { throws: [], total: 501, bust: false, startScore: 501, startTargetIndex: 0 },
          ],
        },
        buddy,
        chris,
      ],
      finishOrder: [hunter.id, friend.id],
      winnerId: hunter.id,
      turnOrderLog: [1], // Friend (index 1) is the reachable "previous" turn, not the winner
      currentTurn: { throws: [], startScore: buddy.score, startTargetIndex: 0 },
      currentPlayerIndex: 2,
    }
    expect(isGameOver(state)).toBe(false)

    state = undo(state)

    expect(state.finishOrder).toEqual([hunter.id])
    expect(state.winnerId).toBe(hunter.id) // unchanged: Friend wasn't the winner
    expect(state.players[1].score).toBe(501)
  })
})

describe('invalid mode defensive branches', () => {
  // Not reachable through normal play (SELECT_MODE always sets a real mode
  // id, and START_GAME requires one) — these guard a modeId that has gone
  // stale or corrupted underneath an in-progress game.
  it('THROW_DART is a no-op if the mode cannot be resolved', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = { ...state, modeId: 'not-a-real-mode' }
    const before = state
    expect(throwDart(state, 20)).toEqual(before)
  })

  it('UNDO is a no-op if the mode cannot be resolved', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = throwDart(state, 20)
    state = { ...state, modeId: 'not-a-real-mode' }
    const before = state
    expect(undo(state)).toEqual(before)
  })

  it('REMATCH is a no-op if the mode cannot be resolved', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = { ...state, modeId: 'not-a-real-mode' }
    const before = state
    expect(dispatch(state, { type: 'REMATCH' })).toEqual(before)
  })

  it('THROW_DART is a no-op in a countdown game if the active player is not shaped like a countdown player', () => {
    let state = newGameAt501WithPlayers('Hunter')
    // Not reachable through normal play (every player in a countdown-family
    // game always has a `score`) — swap in a progression-shaped player.
    state = { ...state, players: [{ id: state.players[0].id, name: 'Hunter', targetIndex: 0, turnHistory: [] }] } as unknown as typeof state
    const before = state
    expect(dispatch(state, { type: 'THROW_DART', segment: 20 })).toEqual(before)
  })

  it('THROW_DART is a no-op in a progression game if the active player is not shaped like a progression player', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    // Not reachable through normal play — swap in a countdown-shaped player.
    state = { ...state, players: [{ id: state.players[0].id, name: 'Hunter', score: 501, turnHistory: [] }] } as unknown as typeof state
    const before = state
    expect(dispatch(state, { type: 'THROW_DART', segment: 1 })).toEqual(before)
  })

  it('same-turn UNDO leaves the player untouched if they are shaped like neither family (mode/player mismatch)', () => {
    let state = newGameAt501WithPlayers('Hunter')
    state = throwDart(state, 20)
    // Not reachable through normal play — swap in a player with neither
    // `score` nor `targetIndex`, in a countdown-family game.
    const oddPlayer = { id: state.players[0].id, name: 'Hunter', turnHistory: [] } as unknown as (typeof state.players)[number]
    state = { ...state, players: [oddPlayer] }

    const result = undo(state)

    expect(result.players[0]).toEqual(oddPlayer) // untouched: neither branch applied
    expect(result.currentTurn.throws).toHaveLength(0)
  })
})

describe('turnAverage', () => {
  it('returns null with no completed turns', () => {
    const state = newGameAt501WithPlayers('Hunter')
    expect(turnAverage(state.players[0])).toBeNull()
  })

  it('averages completed turns, counting a bust as 0', () => {
    let state = newGameAt501WithPlayers('Hunter')
    // Turn 1: total 60
    state = throwDart(state, 20)
    state = throwDart(state, 20)
    state = throwDart(state, 20)
    // Turn 2: bust
    state = { ...state, players: [{ ...state.players[0], score: 5 }] }
    state = throwDart(state, 20)
    expect(turnAverage(state.players[0])).toBe((60 + 0) / 2)
  })
})

describe('ensurePlayerIdCounterAbove', () => {
  it('prevents a newly-added player from reusing a restored id', () => {
    // Simulates restoring persisted state whose players have higher ids than
    // this module's in-memory counter would naturally produce next.
    ensurePlayerIdCounterAbove([{ id: 1_000_000 }])
    let state = selectMode(initialState, '501')
    state = addPlayer(state, 'NewPlayer')
    expect(state.players[0].id).toBeGreaterThan(1_000_000)
  })
})

describe('around the world', () => {
  it('starts every player targeting 1', () => {
    const state = newAroundTheWorldGameWithPlayers('Hunter')
    expect(state.players[0].targetIndex).toBe(0)
  })

  it('advances to the next target on a hit, regardless of multiplier', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    state = setMultiplier(state, 3) // multiplier should be irrelevant in this mode
    state = throwDart(state, 1)
    expect(state.players[0].targetIndex).toBe(1)
  })

  it('does not advance on a miss (wrong number or OUT)', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    state = throwDart(state, 7) // target is 1, this misses
    expect(state.players[0].targetIndex).toBe(0)
    state = throwDart(state, 'OUT')
    expect(state.players[0].targetIndex).toBe(0)
  })

  it('advances to the next player after 3 darts with no win', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter', 'Friend')
    state = throwDart(state, 1) // hit -> targetIndex 1 (needs 2 next)
    state = throwDart(state, 7) // miss
    state = throwDart(state, 7) // miss
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[0].targetIndex).toBe(1)
  })

  it('wins immediately on completing the sequence, without requiring a 3rd dart', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    for (let n = 1; n <= 20; n++) {
      state = throwDart(state, n)
    }
    expect(state.winnerId).toBeNull()
    expect(state.players[0].targetIndex).toBe(20)
    state = throwDart(state, 25) // Bull: the final target
    expect(state.winnerId).toBe(state.players[0].id)
  })

  it('undo recomputes targetIndex from the darts thrown so far this turn', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    state = throwDart(state, 1) // hit -> targetIndex 1
    state = throwDart(state, 2) // hit -> targetIndex 2
    state = undo(state)
    expect(state.players[0].targetIndex).toBe(1)
  })

  it('records turnHistory as a non-bust entry counting hits this turn', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    state = throwDart(state, 1) // hit
    state = throwDart(state, 7) // miss
    state = throwDart(state, 2) // hit (target is still 2 after the miss)
    const [entry] = state.players[0].turnHistory
    expect(entry.bust).toBe(false)
    expect(entry.total).toBe(2)
    expect(entry.throws).toHaveLength(3)
  })

  it('reaches back into a previous, already-completed turn, restoring targetIndex', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter', 'Friend')
    state = throwDart(throwDart(throwDart(state, 1), 2), 3) // Hunter: 1,2,3 all hit -> targetIndex 3, Friend is now active
    expect(state.currentPlayerIndex).toBe(1)
    expect(state.players[0].targetIndex).toBe(3)

    state = undo(state) // Friend's turn has no throws yet -> reaches back into Hunter's turn

    expect(state.currentPlayerIndex).toBe(0)
    expect(state.players[0].targetIndex).toBe(0)
    expect(state.players[0].turnHistory).toHaveLength(0)
    expect(state.currentTurn.throws).toHaveLength(3)
  })

  it('same-turn undo recomputes targetIndex correctly when a miss is among the remaining darts', () => {
    let state = newAroundTheWorldGameWithPlayers('Hunter')
    state = throwDart(state, 7) // miss -> targetIndex stays 0
    state = throwDart(state, 1) // hit -> targetIndex 1
    state = undo(state) // removes the 2nd dart, replays [miss] -> targetIndex stays 0
    expect(state.players[0].targetIndex).toBe(0)
  })
})

describe('unknown action', () => {
  it('returns state unchanged for an action type the reducer does not recognize', () => {
    const state = newGameAt501WithPlayers('Hunter')
    const unknownAction = { type: 'NOT_A_REAL_ACTION' } as unknown as Action
    expect(gameReducer(state, unknownAction)).toBe(state)
  })
})
