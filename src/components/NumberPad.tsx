import { useEffect, useRef, useState } from 'react'
import type { Dispatch, ReactNode } from 'react'
import { useSound } from '../audio/SoundContext'
import { shouldPlayImpressMe } from '../audio/soundTriggers'
import { canUndoPreviousTurn } from '../game/gameReducer'
import type { Action, GameState, Mode, Multiplier, ThrowSegment } from '../game/types'
import { appendDigit, resolveSegment } from './keyboardEntry'

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
  const { playSound } = useSound()
  const [confirmingUndo, setConfirmingUndo] = useState(false)
  const [pending, setPending] = useState('')

  const crossTurnUndo = canUndoPreviousTurn(state)
  const previousPlayerName = crossTurnUndo
    ? state.players[state.turnOrderLog[state.turnOrderLog.length - 1]]?.name
    : null

  function handleUndoClick() {
    if (crossTurnUndo) {
      setConfirmingUndo(true)
      return
    }
    dispatch({ type: 'UNDO' })
  }

  function confirmUndo() {
    setConfirmingUndo(false)
    dispatch({ type: 'UNDO' })
  }

  function toggleMultiplier(multiplier: Multiplier) {
    dispatch({ type: 'SET_MULTIPLIER', multiplier })
  }

  function throwDart(segment: ThrowSegment) {
    // Mirrors throwDartCountdown's own multiplier resolution (gameReducer.ts)
    // so the sound trigger sees the same multiplier the reducer will apply.
    const multiplier: Multiplier = segment === 'OUT' || segment === 50 ? 1 : activeMultiplier
    if (shouldPlayImpressMe(state.currentTurn.throws, segment, multiplier)) {
      playSound('impress me')
    }
    dispatch({ type: 'THROW_DART', segment })
  }

  // Desktop keyboard entry. The handler lives in a ref that's refreshed every
  // render, so the single window listener below always sees the latest state
  // without re-subscribing on every keystroke.
  const isCountdown = mode.family === 'countdown'
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {})
  keyHandlerRef.current = (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return
    const target = e.target
    if (
      target instanceof HTMLElement &&
      (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return
    }

    if (/^\d$/.test(e.key)) {
      setPending((p) => appendDigit(p, e.key, isCountdown))
    } else if (e.key === 'Enter') {
      const segment = resolveSegment(pending, isCountdown)
      if (pending === '') return // let Enter behave normally (e.g. on a focused button)
      e.preventDefault()
      if (segment !== null) throwDart(segment)
      setPending('')
    } else if (e.key === 'Backspace') {
      setPending((p) => p.slice(0, -1))
    } else if (e.key === 'Escape') {
      setPending('')
    } else if (isCountdown && (e.key === 'd' || e.key === 'D')) {
      toggleMultiplier(2)
    } else if (isCountdown && (e.key === 't' || e.key === 'T')) {
      toggleMultiplier(3)
    }
  }
  useEffect(() => {
    const listener = (e: KeyboardEvent) => keyHandlerRef.current(e)
    window.addEventListener('keydown', listener)
    return () => window.removeEventListener('keydown', listener)
  }, [])

  return (
    <div className="number-pad">
      {pending !== '' && (
        <div className="pending-entry" aria-live="polite">
          Enter: {pending}
          {resolveSegment(pending, isCountdown) === null && ' (not a valid score)'}
        </div>
      )}
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
        {mode.family === 'countdown' && (
          <FlashButton className="number-btn bullseye" onClick={() => throwDart(50)}>
            50
          </FlashButton>
        )}
        <FlashButton className="number-btn out" onClick={() => throwDart('OUT')}>
          OUT
        </FlashButton>
        <button
          className={`number-btn undo${mode.family === 'countdown' ? ' undo-narrow' : ''}`}
          onClick={handleUndoClick}
          disabled={state.currentTurn.throws.length === 0 && !crossTurnUndo}
        >
          Undo
        </button>
        {confirmingUndo && previousPlayerName && (
          <div className="undo-confirm">
            <span>Undo {previousPlayerName}'s last turn?</span>
            <div className="undo-confirm-actions">
              <button onClick={confirmUndo}>Yes, undo</button>
              <button onClick={() => setConfirmingUndo(false)}>Cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
