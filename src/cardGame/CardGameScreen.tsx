import { useState, type KeyboardEvent } from 'react'
import { useCardGame, ROUNDS } from './useCardGame'
import { cardLabel } from './deck'
import { getCardStandings } from './standings'
import { ordinal } from '../game/ordinal'
import CardNumberPad from './CardNumberPad'
import './CardGame.css'

interface CardGameScreenProps {
  onExit: () => void
}

export default function CardGameScreen({ onExit }: CardGameScreenProps) {
  const { state, addPlayer, removePlayer, startGame, rematch, newGame, setMultiplier, throwDart, undoDart } =
    useCardGame()
  const [name, setName] = useState('')

  function handleAdd() {
    addPlayer(name)
    setName('')
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleAdd()
  }

  if (state.stage === 'setup') {
    return (
      <div className="screen card-game">
        <div className="screen-header">
          <button className="back-btn" onClick={onExit}>
            ← Back
          </button>
          <h1>Joker Draw</h1>
        </div>
        <p className="subtitle">
          Prototype mode — draw a card each round, its Ace-through-King effect stacks for the
          rest of the game. Highest total after {ROUNDS} rounds wins.
        </p>

        <div className="player-input-row">
          <input
            type="text"
            value={name}
            placeholder="Player name"
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button onClick={handleAdd}>Add</button>
        </div>

        <ul className="player-list">
          {state.players.map((p) => (
            <li key={p.id}>
              <span>{p.name}</span>
              <button className="remove-btn" onClick={() => removePlayer(p.id)}>
                ✕
              </button>
            </li>
          ))}
        </ul>

        <button className="start-btn" disabled={state.players.length === 0} onClick={startGame}>
          Start Game
        </button>
      </div>
    )
  }

  if (state.stage === 'finished') {
    const standings = getCardStandings(state.players)
    const winners = standings.filter((s) => s.place === 1)
    const headline =
      winners.length > 1
        ? `It's a tie: ${winners.map((s) => s.player.name).join(' & ')}!`
        : `${winners[0]?.player.name} wins!`
    return (
      <div className="screen card-game-over">
        <h1>{headline}</h1>
        <ul className="standings-list">
          {standings.map(({ player, place }) => (
            <li key={player.id}>
              <span className="standings-place">{ordinal(place)}</span>
              <span className="standings-name">{player.name}</span>
              <span className="standings-average">{player.total} pts</span>
            </li>
          ))}
        </ul>
        <div className="game-over-actions">
          <button onClick={rematch}>Rematch</button>
          <button onClick={newGame}>New Game</button>
          <button onClick={onExit}>Exit</button>
        </div>
      </div>
    )
  }

  const activePlayer = state.players[state.currentPlayerIndex]
  const canUndo = state.currentTurnDarts.length > 0
  const turnRawSoFar = state.currentTurnDarts.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="screen card-game">
      <div className="card-round-banner">
        Round {state.round} / {ROUNDS}
      </div>

      {state.roundCard && (
        <div className="card-reveal">
          <span className="card-reveal-face">{cardLabel(state.roundCard)}</span>
          <span className="card-reveal-name">
            {state.activeJokers[state.activeJokers.length - 1]?.name}
          </span>
          <span className="card-reveal-desc">
            {state.activeJokers[state.activeJokers.length - 1]?.description}
          </span>
        </div>
      )}

      {state.activeJokers.length > 0 && (
        <div className="active-jokers">
          <span className="active-jokers-label">Active jokers</span>
          <div className="active-jokers-list">
            {state.activeJokers.map((joker, i) => (
              <span className="active-joker-chip" key={`${joker.card.rank}-${joker.card.suit}-${i}`}>
                {cardLabel(joker.card)} {joker.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="turn-banner">{activePlayer?.name}'s turn</div>

      <div className="card-player-list">
        {state.players.map((p, i) => (
          <div key={p.id} className={`card-player-row${i === state.currentPlayerIndex ? ' active' : ''}`}>
            <span className="card-player-name">{p.name}</span>
            <span className="card-player-total">{p.total} pts</span>
            {i === state.currentPlayerIndex && (
              <span className="card-player-turn-preview">this turn: {turnRawSoFar}</span>
            )}
          </div>
        ))}
      </div>

      <CardNumberPad
        multiplier={state.multiplier}
        onSetMultiplier={setMultiplier}
        onThrow={throwDart}
        onUndo={undoDart}
        canUndo={canUndo}
      />
    </div>
  )
}
