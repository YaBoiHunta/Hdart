import { useState, type Dispatch, type KeyboardEvent } from 'react'
import type { Action, GameState } from '../game/types'

interface PlayerSetupScreenProps {
  state: GameState
  dispatch: Dispatch<Action>
}

export default function PlayerSetupScreen({ state, dispatch }: PlayerSetupScreenProps) {
  const [name, setName] = useState('')

  function addPlayer() {
    dispatch({ type: 'ADD_PLAYER', name })
    setName('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') addPlayer()
  }

  return (
    <div className="screen player-setup">
      <div className="screen-header">
        <button className="back-btn" onClick={() => dispatch({ type: 'BACK_TO_MODE_SELECT' })}>
          ← Back
        </button>
        <h1>Players</h1>
      </div>
      <p className="subtitle">Mode: {state.modeId}</p>

      <div className="player-input-row">
        <input
          type="text"
          value={name}
          placeholder="Player name"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button onClick={addPlayer}>Add</button>
      </div>

      <ul className="player-list">
        {state.players.map((p) => (
          <li key={p.id}>
            <span>{p.name}</span>
            <button
              className="remove-btn"
              onClick={() => dispatch({ type: 'REMOVE_PLAYER', playerId: p.id })}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>

      <button
        className="start-btn"
        disabled={state.players.length === 0}
        onClick={() => dispatch({ type: 'START_GAME' })}
      >
        Start Game
      </button>
    </div>
  )
}
