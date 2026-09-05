import type { CardDartMultiplier, CardDartSegment } from './types'

interface CardNumberPadProps {
  multiplier: CardDartMultiplier
  onSetMultiplier: (multiplier: CardDartMultiplier) => void
  onThrow: (segment: CardDartSegment) => void
  onUndo: () => void
  canUndo: boolean
}

const NUMBERS = Array.from({ length: 20 }, (_, i) => i + 1)

export default function CardNumberPad({
  multiplier,
  onSetMultiplier,
  onThrow,
  onUndo,
  canUndo,
}: CardNumberPadProps) {
  return (
    <div className="card-number-pad">
      <div className="card-multiplier-row">
        <button
          className={`card-multiplier-btn${multiplier === 2 ? ' active' : ''}`}
          onClick={() => onSetMultiplier(2)}
        >
          Double
        </button>
        <button
          className={`card-multiplier-btn${multiplier === 3 ? ' active' : ''}`}
          onClick={() => onSetMultiplier(3)}
        >
          Triple
        </button>
      </div>
      <div className="card-number-grid">
        {NUMBERS.map((n) => (
          <button key={n} className="card-number-btn" onClick={() => onThrow(n)}>
            {n}
          </button>
        ))}
        <button className="card-number-btn bull" onClick={() => onThrow(25)}>
          25
        </button>
        <button className="card-number-btn bullseye" onClick={() => onThrow(50)}>
          50
        </button>
        <button className="card-number-btn out" onClick={() => onThrow('OUT')}>
          OUT
        </button>
        <button className="card-number-btn undo" onClick={onUndo} disabled={!canUndo}>
          Undo
        </button>
      </div>
    </div>
  )
}
