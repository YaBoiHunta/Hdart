import { useReducer } from 'react'
import { gameReducer, initialState, PHASES } from './game/gameReducer'
import ModeSelectScreen from './screens/ModeSelectScreen'
import PlayerSetupScreen from './screens/PlayerSetupScreen'
import GameBoardScreen from './screens/GameBoardScreen'
import './App.css'

export default function App() {
  const [state, dispatch] = useReducer(gameReducer, initialState)

  return (
    <>
      {state.phase === PHASES.MODE_SELECT && (
        <ModeSelectScreen dispatch={dispatch} />
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
