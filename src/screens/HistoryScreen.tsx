import { useRef, useState } from 'react'
import { loadHistory, exportHistoryJson, importHistory } from '../game/history'
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
  const [history, setHistory] = useState(loadHistory)
  const [openRows, setOpenRows] = useState<Set<string>>(new Set())
  const [importMessage, setImportMessage] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function toggleRow(key: string) {
    setOpenRows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handleExport() {
    const blob = new Blob([exportHistoryJson()], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    const date = new Date().toISOString().slice(0, 10)
    link.href = url
    link.download = `hdart-history-${date}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  function handleImportClick() {
    fileInputRef.current?.click()
  }

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = importHistory(parsed)
      setHistory(loadHistory())
      setImportMessage(
        result.added === 0 && result.skipped === 0
          ? 'No valid games found in that file.'
          : `Imported ${result.added} game${result.added === 1 ? '' : 's'}` +
              (result.skipped > 0 ? ` (${result.skipped} already had a copy)` : '.'),
      )
    } catch {
      setImportMessage('Could not read that file — is it a Downtime Darts history export?')
    }
  }

  return (
    <div className="screen history-screen">
      <div className="screen-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h1>History</h1>
      </div>

      <div className="history-actions">
        <button className="secondary-btn" onClick={handleExport} disabled={history.length === 0}>
          Export JSON
        </button>
        <button className="secondary-btn" onClick={handleImportClick}>
          Import JSON
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          onChange={handleFileSelected}
          style={{ display: 'none' }}
        />
      </div>
      {importMessage && <p className="subtitle">{importMessage}</p>}

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
