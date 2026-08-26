import { GAME_MODES } from '../game/modes'

export default function ModeSelectScreen({ dispatch }) {
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
    </div>
  )
}
