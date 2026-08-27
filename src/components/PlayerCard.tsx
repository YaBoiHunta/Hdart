import { useEffect, useRef, useState } from 'react'
import { turnAverage } from '../game/gameReducer'
import { isCountdownPlayer, isProgressionPlayer } from '../game/types'
import type { Mode, Player, ThrowRecord } from '../game/types'
import type { RefObject } from 'react'

interface PlayerCardProps {
  player: Player
  mode: Mode
  isActive: boolean
  turnThrows: ThrowRecord[]
}

export default function PlayerCard({ player, mode, isActive, turnThrows }: PlayerCardProps) {
  const [historyOpen, setHistoryOpen] = useState(false)
  const average = turnAverage(player)
  const hasHistory = player.turnHistory.length > 0
  const lastTurn = hasHistory ? player.turnHistory[player.turnHistory.length - 1] : null

  // Score/target pulse: fires on any change, including an undo increasing the value back up.
  const watchedValue = isCountdownPlayer(player)
    ? player.score
    : isProgressionPlayer(player)
      ? player.targetIndex
      : null
  const scoreRef = useRef<HTMLSpanElement>(null)
  const prevValueRef = useRef<number | null>(null) // null = "no prior render yet", distinct from a legit 0

  useEffect(() => {
    if (watchedValue !== null && prevValueRef.current !== null && prevValueRef.current !== watchedValue) {
      const el = scoreRef.current
      if (el) {
        el.classList.remove('pulse')
        void el.offsetWidth // force reflow so the animation restarts even on rapid successive changes
        el.classList.add('pulse')
      }
    }
    prevValueRef.current = watchedValue
  }, [watchedValue])

  // Dart-slot pop-in: detect which slot just filled by comparing turnThrows.length.
  const prevThrowCountRef = useRef(turnThrows.length)
  const [poppingSlot, setPoppingSlot] = useState<number | null>(null)

  useEffect(() => {
    if (isActive && turnThrows.length > prevThrowCountRef.current) {
      setPoppingSlot(turnThrows.length - 1)
    }
    prevThrowCountRef.current = turnThrows.length
  }, [turnThrows.length, isActive])

  // Bust shake: independent of isActive, since currentPlayerIndex has already advanced
  // past this player by the time the bust shows up in state.
  const prevHistoryLenRef = useRef(player.turnHistory.length)
  const [busted, setBusted] = useState(false)

  useEffect(() => {
    if (player.turnHistory.length > prevHistoryLenRef.current) {
      const last = player.turnHistory[player.turnHistory.length - 1]
      if (last.bust) setBusted(true)
    }
    prevHistoryLenRef.current = player.turnHistory.length
  }, [player.turnHistory])

  return (
    <div
      className={`player-card${isActive ? ' active' : ''}${busted ? ' busted' : ''}`}
      onAnimationEnd={(e) => {
        // Guard against bubbled animationend from the .pulse span / .pop-in slots below.
        if (e.target === e.currentTarget) setBusted(false)
      }}
    >
      <div className="player-card-top">
        <span className="player-name">{player.name}</span>
        <span className="player-average">
          Avg {average === null ? '—' : average.toFixed(1)}
        </span>
        {renderStatus(mode, player, scoreRef, () => scoreRef.current?.classList.remove('pulse'))}
      </div>

      {isActive && (
        <div className="dart-slots">
          {[0, 1, 2].map((i) => {
            const t = turnThrows[i]
            return (
              <div
                key={i}
                className={`dart-slot${poppingSlot === i ? ' pop-in' : ''}`}
                onAnimationEnd={() => setPoppingSlot((s) => (s === i ? null : s))}
              >
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

function renderStatus(
  mode: Mode,
  player: Player,
  scoreRef: RefObject<HTMLSpanElement | null>,
  onAnimationEnd: () => void,
) {
  if (mode.family === 'progression' && isProgressionPlayer(player)) {
    return (
      <span className="player-score player-target" ref={scoreRef} onAnimationEnd={onAnimationEnd}>
        <span className="player-target-label">Target</span>
        {mode.sequence[player.targetIndex]}
      </span>
    )
  }
  if (isCountdownPlayer(player)) {
    return (
      <span className="player-score" ref={scoreRef} onAnimationEnd={onAnimationEnd}>
        {player.score}
      </span>
    )
  }
  return null
}

function formatThrow(t: ThrowRecord) {
  if (t.segment === 'OUT') return 'OUT'
  if (t.multiplier === 2) return `D${t.segment}`
  if (t.multiplier === 3) return `T${t.segment}`
  return `${t.segment}`
}
