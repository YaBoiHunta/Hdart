import { getModeById } from './modes'
import {
  PHASES,
  isCountdownPlayer,
  isProgressionPlayer,
} from './types'
import type {
  Action,
  CurrentTurn,
  GameState,
  Mode,
  Player,
  ThrowRecord,
  ThrowSegment,
} from './types'

export { PHASES }
export type { Phase } from './types'

export const initialState: GameState = {
  phase: PHASES.MODE_SELECT,
  modeId: null,
  players: [],
  currentPlayerIndex: 0,
  currentTurn: { throws: [], startScore: 0, startTargetIndex: 0 },
  activeMultiplier: 1,
  winnerId: null,
  historyRecorded: false,
}

let nextPlayerId = 1

function createPlayer(name: string): Player {
  return { id: nextPlayerId++, name, score: 0, turnHistory: [] }
}

// After hydrating state from persisted storage, keep newly-added players
// from reusing an id that a restored player already has.
export function ensurePlayerIdCounterAbove(players: { id: number }[]): void {
  const maxId = players.reduce((max, p) => Math.max(max, p.id), 0)
  if (maxId >= nextPlayerId) nextPlayerId = maxId + 1
}

function throwValue(segment: ThrowSegment, multiplier: number): number {
  if (segment === 'OUT') return 0
  return segment * multiplier
}

function turnPoints(throws: ThrowRecord[]): number {
  return throws.reduce((sum, t) => sum + t.value, 0)
}

function startingPlayerState(player: Player, mode: Mode): Player {
  if (mode.family === 'progression') {
    return { id: player.id, name: player.name, targetIndex: 0, turnHistory: [] }
  }
  return { id: player.id, name: player.name, score: mode.startingScore, turnHistory: [] }
}

function initialTurnFor(mode: Mode): CurrentTurn {
  if (mode.family === 'progression') {
    return { throws: [], startScore: 0, startTargetIndex: 0 }
  }
  return { throws: [], startScore: mode.startingScore, startTargetIndex: 0 }
}

export function gameReducer(state: GameState, action: Action): GameState {
  switch (action.type) {
    case 'SELECT_MODE':
      return { ...state, modeId: action.modeId, phase: PHASES.PLAYER_SETUP }

    case 'BACK_TO_MODE_SELECT':
      // Preserve any players already typed in — going back is for picking a
      // different mode, not for starting over from scratch.
      return { ...state, modeId: null, phase: PHASES.MODE_SELECT }

    case 'ADD_PLAYER': {
      const name = action.name.trim()
      if (!name) return state
      return { ...state, players: [...state.players, createPlayer(name)] }
    }

    case 'REMOVE_PLAYER':
      return {
        ...state,
        players: state.players.filter((p) => p.id !== action.playerId),
      }

    case 'START_GAME': {
      const mode = getModeById(state.modeId)
      if (!mode || state.players.length === 0) return state
      const players = state.players.map((p) => startingPlayerState(p, mode))
      return {
        ...state,
        players,
        phase: PHASES.GAME,
        currentPlayerIndex: 0,
        currentTurn: initialTurnFor(mode),
        activeMultiplier: 1,
        winnerId: null,
        historyRecorded: false,
      }
    }

    case 'SET_MULTIPLIER': {
      const next = state.activeMultiplier === action.multiplier ? 1 : action.multiplier
      return { ...state, activeMultiplier: next }
    }

    case 'THROW_DART': {
      if (state.winnerId) return state
      const mode = getModeById(state.modeId)
      if (!mode) return state
      if (mode.family === 'progression') {
        return throwDartProgression(state, mode, action.segment)
      }
      return throwDartCountdown(state, action.segment)
    }

    case 'UNDO': {
      if (state.currentTurn.throws.length === 0) return state
      const mode = getModeById(state.modeId)
      if (!mode) return state
      const remaining = state.currentTurn.throws.slice(0, -1)
      const players = [...state.players]
      const playerIndex = state.currentPlayerIndex
      const current = players[playerIndex]

      if (mode.family === 'progression' && isProgressionPlayer(current)) {
        let targetIndex = state.currentTurn.startTargetIndex
        for (const t of remaining) {
          if (t.segment !== 'OUT' && t.segment === mode.sequence[targetIndex]) {
            targetIndex += 1
          }
        }
        players[playerIndex] = { ...current, targetIndex }
      } else if (isCountdownPlayer(current)) {
        const usedValue = remaining.reduce((sum, t) => sum + t.value, 0)
        players[playerIndex] = {
          ...current,
          score: state.currentTurn.startScore - usedValue,
        }
      }

      return {
        ...state,
        players,
        currentTurn: { ...state.currentTurn, throws: remaining },
        activeMultiplier: 1,
      }
    }

    case 'NEW_GAME':
      return { ...initialState, phase: PHASES.MODE_SELECT }

    case 'REMATCH': {
      const mode = getModeById(state.modeId)
      if (!mode) return state
      const players = state.players.map((p) => startingPlayerState(p, mode))
      return {
        ...state,
        players,
        phase: PHASES.GAME,
        currentPlayerIndex: 0,
        currentTurn: initialTurnFor(mode),
        activeMultiplier: 1,
        winnerId: null,
        historyRecorded: false,
      }
    }

    case 'MARK_HISTORY_RECORDED':
      return { ...state, historyRecorded: true }

    default:
      return state
  }
}

function throwDartCountdown(state: GameState, segment: ThrowSegment): GameState {
  const player = state.players[state.currentPlayerIndex]
  if (!isCountdownPlayer(player)) return state

  const multiplier = segment === 'OUT' ? 1 : state.activeMultiplier
  const value = throwValue(segment, multiplier)
  const players = [...state.players]
  const playerIndex = state.currentPlayerIndex
  const newScore = player.score - value
  const throwRecord: ThrowRecord = { segment, multiplier, value }
  const throwsThisTurn = [...state.currentTurn.throws, throwRecord]

  if (newScore < 0) {
    // Bust: revert to score at start of turn, end turn immediately.
    players[playerIndex] = {
      ...player,
      score: state.currentTurn.startScore,
      turnHistory: [...player.turnHistory, { throws: throwsThisTurn, total: 0, bust: true }],
    }
    return advanceTurn(state, players)
  }

  if (newScore === 0) {
    players[playerIndex] = {
      ...player,
      score: 0,
      turnHistory: [
        ...player.turnHistory,
        { throws: throwsThisTurn, total: turnPoints(throwsThisTurn), bust: false },
      ],
    }
    return {
      ...state,
      players,
      winnerId: player.id,
      currentTurn: { ...state.currentTurn, throws: throwsThisTurn },
      activeMultiplier: 1,
    }
  }

  if (throwsThisTurn.length >= 3) {
    players[playerIndex] = {
      ...player,
      score: newScore,
      turnHistory: [
        ...player.turnHistory,
        { throws: throwsThisTurn, total: turnPoints(throwsThisTurn), bust: false },
      ],
    }
    return advanceTurn(state, players)
  }

  players[playerIndex] = { ...player, score: newScore }

  return {
    ...state,
    players,
    currentTurn: { ...state.currentTurn, throws: throwsThisTurn },
    activeMultiplier: 1,
  }
}

function throwDartProgression(
  state: GameState,
  mode: Extract<Mode, { family: 'progression' }>,
  segment: ThrowSegment,
): GameState {
  const player = state.players[state.currentPlayerIndex]
  if (!isProgressionPlayer(player)) return state

  const players = [...state.players]
  const playerIndex = state.currentPlayerIndex
  const hit = segment !== 'OUT' && segment === mode.sequence[player.targetIndex]
  const throwRecord: ThrowRecord = { segment, multiplier: 1, value: hit ? 1 : 0 }
  const throwsThisTurn = [...state.currentTurn.throws, throwRecord]
  const targetIndex = hit ? player.targetIndex + 1 : player.targetIndex

  if (hit && targetIndex >= mode.sequence.length) {
    players[playerIndex] = {
      ...player,
      targetIndex,
      turnHistory: [
        ...player.turnHistory,
        { throws: throwsThisTurn, total: turnPoints(throwsThisTurn), bust: false },
      ],
    }
    return {
      ...state,
      players,
      winnerId: player.id,
      currentTurn: { ...state.currentTurn, throws: throwsThisTurn },
      activeMultiplier: 1,
    }
  }

  if (throwsThisTurn.length >= 3) {
    players[playerIndex] = {
      ...player,
      targetIndex,
      turnHistory: [
        ...player.turnHistory,
        { throws: throwsThisTurn, total: turnPoints(throwsThisTurn), bust: false },
      ],
    }
    return advanceTurn(state, players)
  }

  players[playerIndex] = { ...player, targetIndex }

  return {
    ...state,
    players,
    currentTurn: { ...state.currentTurn, throws: throwsThisTurn },
    activeMultiplier: 1,
  }
}

function advanceTurn(state: GameState, players: Player[]): GameState {
  const nextIndex = (state.currentPlayerIndex + 1) % players.length
  const nextPlayer = players[nextIndex]
  const currentTurn: CurrentTurn = {
    throws: [],
    startScore: isCountdownPlayer(nextPlayer) ? nextPlayer.score : 0,
    startTargetIndex: isProgressionPlayer(nextPlayer) ? nextPlayer.targetIndex : 0,
  }
  return {
    ...state,
    players,
    currentPlayerIndex: nextIndex,
    currentTurn,
    activeMultiplier: 1,
  }
}

export function turnAverage(player: Player): number | null {
  if (player.turnHistory.length === 0) return null
  const sum = player.turnHistory.reduce((acc, t) => acc + t.total, 0)
  return sum / player.turnHistory.length
}
