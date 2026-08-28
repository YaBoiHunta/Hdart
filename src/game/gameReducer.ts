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
  finishOrder: [],
  historyRecorded: false,
  turnOrderLog: [],
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
        finishOrder: [],
        historyRecorded: false,
        turnOrderLog: [],
      }
    }

    case 'SET_MULTIPLIER': {
      const next = state.activeMultiplier === action.multiplier ? 1 : action.multiplier
      return { ...state, activeMultiplier: next }
    }

    case 'THROW_DART': {
      if (isGameOver(state)) return state
      const mode = getModeById(state.modeId)
      if (!mode) return state
      if (mode.family === 'progression') {
        return throwDartProgression(state, mode, action.segment)
      }
      return throwDartCountdown(state, action.segment)
    }

    case 'UNDO': {
      if (isGameOver(state)) return state
      const mode = getModeById(state.modeId)
      if (!mode) return state

      if (state.currentTurn.throws.length === 0) {
        return undoIntoPreviousTurn(state)
      }

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
        finishOrder: [],
        historyRecorded: false,
        turnOrderLog: [],
      }
    }

    case 'MARK_HISTORY_RECORDED':
      return { ...state, historyRecorded: true }

    default:
      return state
  }
}

// Reaches back into the previous player's just-completed turn, undoing it as
// if it hadn't happened, and hands the reclaimed throws back to them as their
// in-progress turn (so the normal same-turn undo above can then remove darts
// from it one at a time). Chained/multi-turn undo falls out of this for free:
// once the reclaimed turn is emptied, pressing Undo again re-enters this
// branch and reaches one turn further back via turnOrderLog.
function undoIntoPreviousTurn(state: GameState): GameState {
  if (state.turnOrderLog.length === 0) return state
  const prevIndex = state.turnOrderLog[state.turnOrderLog.length - 1]
  const prevPlayer = state.players[prevIndex]
  if (!prevPlayer || prevPlayer.turnHistory.length === 0) return state

  const poppedEntry = prevPlayer.turnHistory[prevPlayer.turnHistory.length - 1]
  // Entries saved before cross-turn undo shipped don't carry the pre-turn
  // snapshot needed to restore them correctly — treat as unreachable rather
  // than guess.
  if (poppedEntry.startScore === undefined || poppedEntry.startTargetIndex === undefined) {
    return state
  }

  const players = [...state.players]
  const restoredTurnHistory = prevPlayer.turnHistory.slice(0, -1)
  players[prevIndex] = isCountdownPlayer(prevPlayer)
    ? { ...prevPlayer, score: poppedEntry.startScore, turnHistory: restoredTurnHistory }
    : { ...prevPlayer, targetIndex: poppedEntry.startTargetIndex, turnHistory: restoredTurnHistory }

  let finishOrder = state.finishOrder
  let winnerId = state.winnerId
  if (finishOrder.includes(prevPlayer.id)) {
    finishOrder = finishOrder.filter((id) => id !== prevPlayer.id)
    if (winnerId === prevPlayer.id) {
      winnerId = finishOrder[0] ?? null
    }
  }

  return {
    ...state,
    players,
    finishOrder,
    winnerId,
    currentPlayerIndex: prevIndex,
    currentTurn: {
      throws: poppedEntry.throws,
      startScore: poppedEntry.startScore,
      startTargetIndex: poppedEntry.startTargetIndex,
    },
    activeMultiplier: 1,
    turnOrderLog: state.turnOrderLog.slice(0, -1),
  }
}

// Whether pressing Undo right now would reach back into a previous player's
// completed turn (as opposed to just removing a dart from the current turn).
export function canUndoPreviousTurn(state: GameState): boolean {
  return (
    !isGameOver(state) &&
    state.currentTurn.throws.length === 0 &&
    state.turnOrderLog.length > 0
  )
}

function throwDartCountdown(state: GameState, segment: ThrowSegment): GameState {
  const player = state.players[state.currentPlayerIndex]
  if (!isCountdownPlayer(player)) return state

  const multiplier = segment === 'OUT' || segment === 50 ? 1 : state.activeMultiplier
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
      turnHistory: [
        ...player.turnHistory,
        {
          throws: throwsThisTurn,
          total: 0,
          bust: true,
          startScore: state.currentTurn.startScore,
          startTargetIndex: state.currentTurn.startTargetIndex,
        },
      ],
    }
    return advanceTurn(state, players)
  }

  if (newScore === 0) {
    players[playerIndex] = {
      ...player,
      score: 0,
      turnHistory: [
        ...player.turnHistory,
        {
          throws: throwsThisTurn,
          total: turnPoints(throwsThisTurn),
          bust: false,
          startScore: state.currentTurn.startScore,
          startTargetIndex: state.currentTurn.startTargetIndex,
        },
      ],
    }
    return finishPlayer(state, players, player.id, throwsThisTurn)
  }

  if (throwsThisTurn.length >= 3) {
    players[playerIndex] = {
      ...player,
      score: newScore,
      turnHistory: [
        ...player.turnHistory,
        {
          throws: throwsThisTurn,
          total: turnPoints(throwsThisTurn),
          bust: false,
          startScore: state.currentTurn.startScore,
          startTargetIndex: state.currentTurn.startTargetIndex,
        },
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
        {
          throws: throwsThisTurn,
          total: turnPoints(throwsThisTurn),
          bust: false,
          startScore: state.currentTurn.startScore,
          startTargetIndex: state.currentTurn.startTargetIndex,
        },
      ],
    }
    return finishPlayer(state, players, player.id, throwsThisTurn)
  }

  if (throwsThisTurn.length >= 3) {
    players[playerIndex] = {
      ...player,
      targetIndex,
      turnHistory: [
        ...player.turnHistory,
        {
          throws: throwsThisTurn,
          total: turnPoints(throwsThisTurn),
          bust: false,
          startScore: state.currentTurn.startScore,
          startTargetIndex: state.currentTurn.startTargetIndex,
        },
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

// Finishing a player ends the game outright once at most one other player is
// still unfinished (they take last place automatically, with no more darts to
// throw); otherwise the finisher is removed from rotation and play continues.
function finishPlayer(
  state: GameState,
  players: Player[],
  finisherId: number,
  throwsThisTurn: ThrowRecord[],
): GameState {
  const finishOrder = [...state.finishOrder, finisherId]
  const stateWithFinish: GameState = {
    ...state,
    players,
    finishOrder,
    winnerId: state.winnerId ?? finisherId,
    currentTurn: { ...state.currentTurn, throws: throwsThisTurn },
    activeMultiplier: 1,
  }
  const remaining = players.length - finishOrder.length
  return remaining <= 1 ? stateWithFinish : advanceTurn(stateWithFinish, players)
}

function advanceTurn(state: GameState, players: Player[]): GameState {
  const finishedIds = new Set(state.finishOrder)
  let nextIndex = state.currentPlayerIndex
  for (let i = 0; i < players.length; i++) {
    nextIndex = (nextIndex + 1) % players.length
    if (!finishedIds.has(players[nextIndex].id)) break
  }
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
    turnOrderLog: [...state.turnOrderLog, state.currentPlayerIndex],
  }
}

export function turnAverage(player: Player): number | null {
  if (player.turnHistory.length === 0) return null
  const sum = player.turnHistory.reduce((acc, t) => acc + t.total, 0)
  return sum / player.turnHistory.length
}

export function isGameOver(state: GameState): boolean {
  if (state.finishOrder.length > 0) {
    return state.players.length - state.finishOrder.length <= 1
  }
  // Defense-in-depth for legacy persisted states that predate finishOrder
  // but already have winnerId set (see App.tsx's migration on load).
  return state.winnerId !== null
}

// Finished players (in finish order) followed by any player still unfinished
// (only relevant once the game is over, at which point at most one remains).
export function getStandings(state: GameState): Player[] {
  const byId = new Map(state.players.map((p) => [p.id, p]))
  const finished = state.finishOrder
    .map((id) => byId.get(id))
    .filter((p): p is Player => !!p)
  const finishedIds = new Set(state.finishOrder)
  const remaining = state.players.filter((p) => !finishedIds.has(p.id))
  return [...finished, ...remaining]
}

// 1-indexed placement, or null if this player hasn't finished and the game
// is still going. The one player left standing when the game ends never
// gets pushed onto finishOrder (they win last place "by default"), so once
// the game is over, treat any not-yet-finished player as last place.
export function placementOf(state: GameState, playerId: number): number | null {
  const idx = state.finishOrder.indexOf(playerId)
  if (idx !== -1) return idx + 1
  return isGameOver(state) ? state.players.length : null
}
