import { useState } from 'react'

export default function PlayerSetupScreen({ state, dispatch }) {
  const [name, setName] = useState('')

  function addPlayer() {
    dispatch({ type: 'ADD_PLAYER', name })
    setName('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') addPlayer()
  }

  return (
    <div className="screen player-setup">
      <h1>Players</h1>
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
