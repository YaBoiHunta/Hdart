import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import GameBoardScreen from './GameBoardScreen'
import { initialState, PHASES } from '../game/gameReducer'
import type { CountdownPlayer, GameState } from '../game/types'

describe('GameBoardScreen', () => {
  it('renders nothing when the phase is GAME but modeId/players are not resolvable', () => {
    // Not reachable through normal play (START_GAME always sets a valid mode
    // and at least one player) — this guards a state that could only arise
    // from corrupted/foreign persisted state slipping past isUsableState.
    const state: GameState = { ...initialState, phase: PHASES.GAME, modeId: 'not-a-real-mode' }
    const { container } = render(<GameBoardScreen state={state} dispatch={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows a dash average on the standings for a player with no completed turns', () => {
    // Not reachable through normal 301/501 play (the loser always gets at
    // least one turn before the winner can check out, since a single turn
    // can score at most 180) — construct the state directly instead.
    const winner: CountdownPlayer = {
      id: 1,
      name: 'Hunter',
      score: 0,
      turnHistory: [{ throws: [], total: 301, bust: false }],
    }
    const neverPlayed: CountdownPlayer = { id: 2, name: 'Friend', score: 301, turnHistory: [] }
    const state: GameState = {
      ...initialState,
      phase: PHASES.GAME,
      modeId: '301',
      players: [winner, neverPlayed],
      winnerId: 1,
      finishOrder: [1, 2],
    }
    render(<GameBoardScreen state={state} dispatch={vi.fn()} />)
    const friendStanding = screen.getByText('Friend').closest('li')
    expect(friendStanding?.textContent).toContain('—')
  })
})
