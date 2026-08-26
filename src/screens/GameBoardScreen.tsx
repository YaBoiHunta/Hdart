import { useState, type Dispatch } from 'react'
import PlayerCard from '../components/PlayerCard'
import NumberPad from '../components/NumberPad'
import { getModeById } from '../game/modes'
import type { Action, GameState } from '../game/types'

interface GameBoardScreenProps {
  state: GameState
  dispatch: Dispatch<Action>
}

export default function GameBoardScreen({ state, dispatch }: GameBoardScreenProps) {
  const [confirmingQuit, setConfirmingQuit] = useState(false)
  const mode = getModeById(state.modeId)
  const activePlayer = state.players[state.currentPlayerIndex]
  const winner = state.players.find((p) => p.id === state.winnerId)

  if (!mode || !activePlayer) return null

  if (winner) {
    return (
      <div className="screen game-over">
        <h1>{winner.name} wins!</h1>
        <div className="game-over-actions">
          <button onClick={() => dispatch({ type: 'REMATCH' })}>Rematch</button>
          <button onClick={() => dispatch({ type: 'NEW_GAME' })}>New Game</button>
        </div>
      </div>
    )
  }

  return (
    <div className="screen game-board">
      {confirmingQuit ? (
        <div className="quit-confirm">
          <span>Quit this game?</span>
          <div className="quit-confirm-actions">
            <button onClick={() => dispatch({ type: 'NEW_GAME' })}>Yes, quit</button>
            <button onClick={() => setConfirmingQuit(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <button className="quit-btn" onClick={() => setConfirmingQuit(true)}>
          Quit Game
        </button>
      )}

      <div className="turn-banner">{activePlayer.name}'s turn</div>

      <div className="player-list-board">
        {state.players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            mode={mode}
            isActive={i === state.currentPlayerIndex}
            turnThrows={state.currentTurn.throws}
          />
        ))}
      </div>

      <NumberPad state={state} dispatch={dispatch} mode={mode} />
    </div>
  )
}
