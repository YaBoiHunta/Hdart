import { useEffect, useRef, useState, useReducer } from 'react'
import { gameReducer, initialState, PHASES, ensurePlayerIdCounterAbove } from './game/gameReducer'
import { loadPersistedState, savePersistedState } from './game/persistence'
import { buildGameSummary, appendGameResult } from './game/history'
import ModeSelectScreen from './screens/ModeSelectScreen'
import PlayerSetupScreen from './screens/PlayerSetupScreen'
import GameBoardScreen from './screens/GameBoardScreen'
import HistoryScreen from './screens/HistoryScreen'
import './App.css'

const VALID_PHASES = new Set(Object.values(PHASES))

function isUsableState(saved) {
  return (
    saved &&
    typeof saved === 'object' &&
    VALID_PHASES.has(saved.phase) &&
    Array.isArray(saved.players)
  )
}

function initState() {
  const saved = loadPersistedState()
  if (!isUsableState(saved)) return initialState
  ensurePlayerIdCounterAbove(saved.players)
  return saved
}

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState, initState)
  const [historyOpen, setHistoryOpen] = useState(false)
  const lastRecordedWinnerRef = useRef(null)

  useEffect(() => {
    savePersistedState(state)
  }, [state])

  useEffect(() => {
    if (state.winnerId && lastRecordedWinnerRef.current !== state.winnerId) {
      lastRecordedWinnerRef.current = state.winnerId
      appendGameResult(buildGameSummary(state))
    } else if (!state.winnerId) {
      lastRecordedWinnerRef.current = null
    }
    // Only the moment winnerId changes matters here; state is read from the
    // same render's closure, which is already up to date at that point.
  }, [state.winnerId])

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
