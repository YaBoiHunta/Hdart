import { useState } from 'react'
import { loadHistory } from '../game/history'
import { formatThrow } from '../game/format'

interface HistoryScreenProps {
  onBack: () => void
}

function formatDate(isoString: string) {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function HistoryScreen({ onBack }: HistoryScreenProps) {
  const history = loadHistory()
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())

  function toggleRow(key: string) {
    setOpenRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  return (
    <div className="screen history-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>History</h1>
      </div>

      {history.length === 0 && (
        <p className="subtitle">No games finished yet.</p>
      )}

      <ul className="game-history-list">
        {history.map((game, i) => (
          <li key={i} className="game-history-entry">
            <div className="game-history-meta">
              <span>{game.modeLabel ?? game.modeId}</span>
              <span>{formatDate(game.finishedAt)}</span>
            </div>
            {game.highestRound && (
              <div className="game-history-highlight">
                Best round: {game.highestRound.total} ({game.highestRound.playerName})
              </div>
            )}
            <ul className="game-history-players">
              {game.players.map((p, j) => {
                const rowKey = `${i}-${j}`
                const rounds = p.turnHistory ?? []
                const rowOpen = openRows.has(rowKey)
                return (
                  <li key={j} className={p.won ? 'won' : ''}>
                    <span>
                      {p.name}
                      {p.won ? ' (won)' : ''}
                    </span>
                    <span>{p.average === null ? '—' : `avg ${p.average.toFixed(1)}`}</span>
                    {rounds.length > 0 && (
                      <button className="history-toggle" onClick={() => toggleRow(rowKey)}>
                        {rowOpen ? 'Hide rounds ▲' : `Rounds (${rounds.length}) ▼`}
                      </button>
                    )}
                    {rowOpen && (
                      <ul className="turn-history">
                        {rounds.map((t, k) => (
                          <li key={k} className={t.bust ? 'bust' : ''}>
                            <span className="turn-history-label">Turn {k + 1}</span>
                            <span className="turn-history-darts">
                              {t.throws.map((dart, d) => (
                                <span key={d} className="turn-history-dart">
                                  {formatThrow(dart)}
                                </span>
                              ))}
                            </span>
                            <span className="turn-history-total">{t.bust ? 'BUST' : t.total}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                )
              })}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
