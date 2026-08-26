import PlayerCard from '../components/PlayerCard'
import NumberPad from '../components/NumberPad'

export default function GameBoardScreen({ state, dispatch }) {
  const activePlayer = state.players[state.currentPlayerIndex]
  const winner = state.players.find((p) => p.id === state.winnerId)

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
      <div className="turn-banner">{activePlayer.name}'s turn</div>

      <div className="player-list-board">
        {state.players.map((p, i) => (
          <PlayerCard
            key={p.id}
            player={p}
            isActive={i === state.currentPlayerIndex}
            turnThrows={state.currentTurn.throws}
          />
        ))}
      </div>

      <NumberPad state={state} dispatch={dispatch} />
    </div>
  )
}
