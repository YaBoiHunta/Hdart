import { getModeById } from './modes'

export const PHASES = {
  MODE_SELECT: 'mode-select',
  PLAYER_SETUP: 'player-setup',
  GAME: 'game',
}

export const initialState = {
  phase: PHASES.MODE_SELECT,
  modeId: null,
  players: [],
  currentPlayerIndex: 0,
  currentTurn: { throws: [], startScore: 0 },
  activeMultiplier: 1,
  winnerId: null,
}

let nextPlayerId = 1

function createPlayer(name) {
  return { id: nextPlayerId++, name, score: 0, turnHistory: [] }
}

function throwValue(segment, multiplier) {
  if (segment === 'OUT') return 0
  return segment * multiplier
}

function turnPoints(throws) {
  return throws.reduce((sum, t) => sum + t.value, 0)
}

export function gameReducer(state, action) {
  switch (action.type) {
    case 'SELECT_MODE':
      return { ...state, modeId: action.modeId, phase: PHASES.PLAYER_SETUP }

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
      const players = state.players.map((p) => ({
        ...p,
        score: mode.startingScore,
        turnHistory: [],
      }))
      return {
        ...state,
        players,
        phase: PHASES.GAME,
        currentPlayerIndex: 0,
        currentTurn: { throws: [], startScore: mode.startingScore },
        activeMultiplier: 1,
        winnerId: null,
      }
    }

    case 'SET_MULTIPLIER': {
      const next = state.activeMultiplier === action.multiplier ? 1 : action.multiplier
      return { ...state, activeMultiplier: next }
    }

    case 'THROW_DART': {
      if (state.winnerId) return state
      const { segment } = action
      const multiplier = segment === 'OUT' ? 1 : state.activeMultiplier
      const value = throwValue(segment, multiplier)
      const players = [...state.players]
      const playerIndex = state.currentPlayerIndex
      const player = players[playerIndex]
      const newScore = player.score - value
      const throwRecord = { segment, multiplier, value }
      const throwsThisTurn = [...state.currentTurn.throws, throwRecord]

      if (newScore < 0) {
        // Bust: revert to score at start of turn, end turn immediately.
        players[playerIndex] = {
          ...player,
          score: state.currentTurn.startScore,
          turnHistory: [
            ...player.turnHistory,
            { throws: throwsThisTurn, total: 0, bust: true },
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
            { throws: throwsThisTurn, total: turnPoints(throwsThisTurn), bust: false },
          ],
        }
        return {
          ...state,
          players,
          winnerId: player.id,
          currentTurn: { throws: throwsThisTurn, startScore: state.currentTurn.startScore },
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
        currentTurn: { throws: throwsThisTurn, startScore: state.currentTurn.startScore },
        activeMultiplier: 1,
      }
    }

    case 'UNDO': {
      if (state.currentTurn.throws.length === 0) return state
      const remaining = state.currentTurn.throws.slice(0, -1)
      const usedValue = remaining.reduce((sum, t) => sum + t.value, 0)
      const players = [...state.players]
      const playerIndex = state.currentPlayerIndex
      players[playerIndex] = {
        ...players[playerIndex],
        score: state.currentTurn.startScore - usedValue,
      }
      return {
        ...state,
        players,
        currentTurn: { throws: remaining, startScore: state.currentTurn.startScore },
        activeMultiplier: 1,
      }
    }

    case 'NEW_GAME':
      return { ...initialState, phase: PHASES.MODE_SELECT }

    case 'REMATCH': {
      const mode = getModeById(state.modeId)
      const players = state.players.map((p) => ({
        ...p,
        score: mode.startingScore,
        turnHistory: [],
      }))
      return {
        ...state,
        players,
        phase: PHASES.GAME,
        currentPlayerIndex: 0,
        currentTurn: { throws: [], startScore: mode.startingScore },
        activeMultiplier: 1,
        winnerId: null,
      }
    }

    default:
      return state
  }
}

function advanceTurn(state, players) {
  const nextIndex = (state.currentPlayerIndex + 1) % players.length
  return {
    ...state,
    players,
    currentPlayerIndex: nextIndex,
    currentTurn: { throws: [], startScore: players[nextIndex].score },
    activeMultiplier: 1,
  }
}

export function turnAverage(player) {
  if (player.turnHistory.length === 0) return null
  const sum = player.turnHistory.reduce((acc, t) => acc + t.total, 0)
  return sum / player.turnHistory.length
}
