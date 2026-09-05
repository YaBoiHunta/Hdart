import type { Dispatch } from 'react'
import { GAME_MODES } from '../game/modes'
import type { Action } from '../game/types'

interface ModeSelectScreenProps {
  dispatch: Dispatch<Action>
  onShowHistory: () => void
  onOpenCardGame: () => void
}

export default function ModeSelectScreen({ dispatch, onShowHistory, onOpenCardGame }: ModeSelectScreenProps) {
  return (
    <div className="screen mode-select">
      <h1>Downtime Darts</h1>
      <p className="subtitle">Choose a game mode</p>
      <div className="mode-grid">
        {GAME_MODES.map((mode) => (
          <button
            key={mode.id}
            className="mode-card"
            onClick={() => dispatch({ type: 'SELECT_MODE', modeId: mode.id })}
          >
            {mode.label}
          </button>
        ))}
        <button className="mode-card" onClick={onOpenCardGame}>
          Joker Draw (Beta)
        </button>
      </div>
      <button className="history-entry-btn" onClick={onShowHistory}>
        History
      </button>
    </div>
  )
}
