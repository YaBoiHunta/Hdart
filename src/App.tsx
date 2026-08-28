import { useEffect, useState, useReducer } from 'react'
import { gameReducer, initialState, PHASES, ensurePlayerIdCounterAbove } from './game/gameReducer'
import { loadPersistedState, savePersistedState } from './game/persistence'
import { buildGameSummary, appendGameResult } from './game/history'
import type { GameState } from './game/types'
import ModeSelectScreen from './screens/ModeSelectScreen'
import PlayerSetupScreen from './screens/PlayerSetupScreen'
import GameBoardScreen from './screens/GameBoardScreen'
import HistoryScreen from './screens/HistoryScreen'
import './App.css'

const VALID_PHASES = new Set<string>(Object.values(PHASES))

function isUsableState(saved: unknown): saved is GameState {
  if (!saved || typeof saved !== 'object') return false
  const candidate = saved as { phase?: unknown; players?: unknown }
  return (
    typeof candidate.phase === 'string' &&
    VALID_PHASES.has(candidate.phase) &&
    Array.isArray(candidate.players)
  )
}

function initState(): GameState {
  const saved = loadPersistedState()
  if (!isUsableState(saved)) return initialState
  ensurePlayerIdCounterAbove(saved.players)
  return saved
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState, initState)
  const [historyOpen, setHistoryOpen] = useState(false)

  useEffect(() => {
    savePersistedState(state)
  }, [state])

  useEffect(() => {
    // historyRecorded lives in persisted state (not a ref) so a page refresh
    // right after a win can't re-trigger this and record the game twice.
    if (state.winnerId && !state.historyRecorded) {
      appendGameResult(buildGameSummary(state))
      dispatch({ type: 'MARK_HISTORY_RECORDED' })
    }
    // Only the moment winnerId/historyRecorded changes matters here; state is
    // read from the same render's closure, which is already up to date then.
    // oxlint-disable-next-line react-hooks/exhaustive-deps
  }, [state.winnerId, state.historyRecorded])

  if (historyOpen) {
    return <HistoryScreen onBack={() => setHistoryOpen(false)} />
  }

  return (
    <>
      {state.phase === PHASES.MODE_SELECT && (
        <ModeSelectScreen dispatch={dispatch} onShowHistory={() => setHistoryOpen(true)} />
      )}
      {state.phase === PHASES.PLAYER_SETUP && (
        <PlayerSetupScreen state={state} dispatch={dispatch} />
      )}
      {state.phase === PHASES.GAME && (
        <GameBoardScreen state={state} dispatch={dispatch} />
      )}
    </>
  )
}
