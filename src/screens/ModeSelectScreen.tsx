import type { Dispatch } from 'react'
import { GAME_MODES } from '../game/modes'
import type { Action } from '../game/types'

interface ModeSelectScreenProps {
  dispatch: Dispatch<Action>
  onShowHistory: () => void
}

export default function ModeSelectScreen({ dispatch, onShowHistory }: ModeSelectScreenProps) {
  return (
    <div className="screen mode-select">
      <h1>Hunter Darts</h1>
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
      </div>
      <button className="history-entry-btn" onClick={onShowHistory}>
        History
      </button>
    </div>
  )
}
