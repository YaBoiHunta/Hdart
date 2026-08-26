import { loadHistory } from '../game/history'

function formatDate(isoString) {
  return new Date(isoString).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

export default function HistoryScreen({ onBack }) {
  const history = loadHistory()

  return (
    <div className="screen history-screen">
      <div className="history-header">
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
            <ul className="game-history-players">
              {game.players.map((p, j) => (
                <li key={j} className={p.won ? 'won' : ''}>
                  <span>
                    {p.name}
                    {p.won ? ' (won)' : ''}
                  </span>
                  <span>{p.average === null ? '—' : `avg ${p.average.toFixed(1)}`}</span>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  )
}
