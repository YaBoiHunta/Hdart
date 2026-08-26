import type { Dispatch } from 'react'
import type { Action, GameState, Mode, Multiplier, ThrowSegment } from '../game/types'

interface NumberPadProps {
  state: GameState
  dispatch: Dispatch<Action>
  mode: Mode
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export default function NumberPad({ state, dispatch, mode }: NumberPadProps) {
  const { activeMultiplier } = state

  function toggleMultiplier(multiplier: Multiplier) {
    dispatch({ type: 'SET_MULTIPLIER', multiplier })
  }

  function throwDart(segment: ThrowSegment) {
    dispatch({ type: 'THROW_DART', segment })
  }

  return (
    <div className="number-pad">
      {mode.family === 'countdown' && (
        <div className="multiplier-row">
          <button
            className={`multiplier-btn${activeMultiplier === 2 ? ' active' : ''}`}
            onClick={() => toggleMultiplier(2)}
          >
            Double
          </button>
          <button
            className={`multiplier-btn${activeMultiplier === 3 ? ' active' : ''}`}
            onClick={() => toggleMultiplier(3)}
          >
            Triple
          </button>
        </div>
      )}

      <div className="number-grid">
        {NUMBERS.map((n) => (
          <button key={n} className="number-btn" onClick={() => throwDart(n)}>
            {n}
          </button>
        ))}
        <button className="number-btn bull" onClick={() => throwDart(25)}>
          25
        </button>
        <button className="number-btn out" onClick={() => throwDart('OUT')}>
          OUT
        </button>
        <button
          className="number-btn undo"
          onClick={() => dispatch({ type: 'UNDO' })}
          disabled={state.currentTurn.throws.length === 0}
        >
          Undo
        </button>
      </div>
    </div>
  )
}
