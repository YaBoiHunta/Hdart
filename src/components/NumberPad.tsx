import { useRef } from 'react'
import type { Dispatch, ReactNode } from 'react'
import type { Action, GameState, Mode, Multiplier, ThrowSegment } from '../game/types'

interface NumberPadProps {
  state: GameState
  dispatch: Dispatch<Action>
  mode: Mode
}

interface FlashButtonProps {
  className: string
  onClick: () => void
  children: ReactNode
}

function FlashButton({ className, onClick, children }: FlashButtonProps) {
  const ref = useRef<HTMLButtonElement>(null)

  function handleClick() {
    onClick()
    const el = ref.current
    if (el) {
      el.classList.remove('flash')
      void el.offsetWidth // force reflow so the animation restarts even on repeated taps
      el.classList.add('flash')
    }
  }

  return (
    <button
      ref={ref}
      className={className}
      onClick={handleClick}
      onAnimationEnd={() => ref.current?.classList.remove('flash')}
    >
      {children}
    </button>
  )
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
          <FlashButton key={n} className="number-btn" onClick={() => throwDart(n)}>
            {n}
          </FlashButton>
        ))}
        <FlashButton className="number-btn bull" onClick={() => throwDart(25)}>
          25
        </FlashButton>
        <FlashButton className="number-btn out" onClick={() => throwDart('OUT')}>
          OUT
        </FlashButton>
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
