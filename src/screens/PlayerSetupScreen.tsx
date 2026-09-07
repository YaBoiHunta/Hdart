import { useMemo, useState, type Dispatch, type KeyboardEvent } from 'react'
import { getRecentPlayerNames } from '../game/history'
import type { Action, GameState } from '../game/types'

interface PlayerSetupScreenProps {
  state: GameState
  dispatch: Dispatch<Action>
}

// Chips only show a handful of one-tap names; the datalist can hold more
// since it's just filtered suggestions behind typing, not laid out on screen.
const RECENT_CHIP_COUNT = 8

export default function PlayerSetupScreen({ state, dispatch }: PlayerSetupScreenProps) {
  const [name, setName] = useState('')
  // Read once per screen visit rather than on every keystroke — recent
  // players only change between completed games, not while typing a name.
  const recentNames = useMemo(() => getRecentPlayerNames(), [])

  function addPlayer(playerName: string = name) {
    dispatch({ type: 'ADD_PLAYER', name: playerName })
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

      {recentNames.length > 0 && (
        <div className="recent-players">
          <span className="recent-players-label">Recent:</span>
          <div className="recent-players-chips">
            {recentNames.slice(0, RECENT_CHIP_COUNT).map((n) => (
              <button key={n} type="button" className="chip" onClick={() => addPlayer(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="player-input-row">
        <input
          type="text"
          value={name}
          placeholder="Player name"
          list="recent-player-names"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <datalist id="recent-player-names">
          {recentNames.map((n) => (
            <option key={n} value={n} />
          ))}
        </datalist>
        <button onClick={() => addPlayer()}>Add</button>
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
