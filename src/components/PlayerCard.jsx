import { useState } from 'react'
import { turnAverage } from '../game/gameReducer'

export default function PlayerCard({ player, isActive, turnThrows }) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const average = turnAverage(player)
  const hasHistory = player.turnHistory.length > 0
  const lastTurn = hasHistory ? player.turnHistory[player.turnHistory.length - 1] : null

  return (
    <div className={`player-card${isActive ? ' active' : ''}`}>
      <div className="player-card-top">
        <span className="player-name">{player.name}</span>
        <span className="player-average">
          Avg {average === null ? '—' : average.toFixed(1)}
        </span>
        <span className="player-score">{player.score}</span>
      </div>

      {isActive && (
        <div className="dart-slots">
          {[0, 1, 2].map((i) => {
            const t = turnThrows[i]
            return (
              <div key={i} className="dart-slot">
                {t ? formatThrow(t) : ''}
              </div>
            )
          })}
        </div>
      )}

      {lastTurn && (
        <div className={`previous-turn${lastTurn.bust ? ' bust' : ''}`}>
          <span className="turn-history-label">Last turn</span>
          <span className="turn-history-darts">
            {lastTurn.throws.map((dart, j) => (
              <span key={j} className="turn-history-dart">
                {formatThrow(dart)}
              </span>
            ))}
          </span>
          <span className="turn-history-total">{lastTurn.bust ? 'BUST' : lastTurn.total}</span>
        </div>
      )}

      {player.turnHistory.length > 1 && (
        <button
          className="history-toggle"
          onClick={() => setHistoryOpen((open) => !open)}
        >
          {historyOpen ? 'Hide full history ▲' : `Full history (${player.turnHistory.length}) ▼`}
        </button>
      )}

      {historyOpen && (
        <ul className="turn-history">
          {player.turnHistory.map((t, i) => (
            <li key={i} className={t.bust ? 'bust' : ''}>
              <span className="turn-history-label">Turn {i + 1}</span>
              <span className="turn-history-darts">
                {t.throws.map((dart, j) => (
                  <span key={j} className="turn-history-dart">
                    {formatThrow(dart)}
                  </span>
                ))}
              </span>
              <span className="turn-history-total">{t.bust ? 'BUST' : t.total}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

function formatThrow(t) {
  if (t.segment === 'OUT') return 'OUT'
  if (t.multiplier === 2) return `D${t.segment}`
  if (t.multiplier === 3) return `T${t.segment}`
  return `${t.segment}`
}
