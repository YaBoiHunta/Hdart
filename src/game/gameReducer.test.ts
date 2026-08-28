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

  it('UNDO is a no-op immediately after a finish, in a game that continues', () => {
    let state = newGameAt501WithPlayers('A', 'B', 'C')
    state = { ...state, players: [{ ...state.players[0], score: 20 }, state.players[1], state.players[2]] }
    state = throwDart(state, 20) // A finishes, game continues onto B
    const afterFinish = state
    state = undo(state)
    expect(state).toEqual(afterFinish)
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

  it('cannot reach into a previous, already-completed turn', () => {
    let state = newGameAt501WithPlayers('Hunter', 'Friend')
    state = throwDart(state, 20)
    state = throwDart(state, 20)
    state = throwDart(state, 20) // Hunter's turn ends, Friend is now active
    const afterHuntersTurn = state
    state = undo(state) // should be a no-op: Friend's turn has no throws yet
    expect(state).toEqual(afterHuntersTurn)
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
})
