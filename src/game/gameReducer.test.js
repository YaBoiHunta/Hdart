import { describe, it, expect } from 'vitest'
import {
  gameReducer,
  initialState,
  turnAverage,
  PHASES,
  ensurePlayerIdCounterAbove,
} from './gameReducer'

function selectMode(state, modeId) {
  return gameReducer(state, { type: 'SELECT_MODE', modeId })
}

function addPlayer(state, name) {
  return gameReducer(state, { type: 'ADD_PLAYER', name })
}

function startGame(state) {
  return gameReducer(state, { type: 'START_GAME' })
}

function throwDart(state, segment) {
  return gameReducer(state, { type: 'THROW_DART', segment })
}

function setMultiplier(state, multiplier) {
  return gameReducer(state, { type: 'SET_MULTIPLIER', multiplier })
}

function undo(state) {
  return gameReducer(state, { type: 'UNDO' })
}

function newGameAt501WithPlayers(...names) {
  let state = selectMode(initialState, '501')
  for (const name of names) state = addPlayer(state, name)
  return startGame(state)
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
    state = gameReducer(state, { type: 'REMOVE_PLAYER', playerId: hunter.id })
    expect(state.players).toHaveLength(1)
    expect(state.players[0].name).toBe('Friend')
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
    const finishTurn = (s) => throwDart(throwDart(throwDart(s, 1), 1), 1)
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
