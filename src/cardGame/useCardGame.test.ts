import { describe, it, expect, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useCardGame, ROUNDS } from './useCardGame'
import { createShuffledDeck, drawCard } from './deck'
import { JOKER_TABLE } from './jokers'

vi.mock('./deck', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./deck')>()
  return { ...actual, drawCard: vi.fn(actual.drawCard) }
})

// A fixed "random" source (always 0) makes createShuffledDeck's draw order
// reproducible across the hook and the assertions, without depending on
// which exact card comes up.
function fixedRandom() {
  return 0
}

describe('useCardGame', () => {
  it('addPlayer/removePlayer manage the roster before starting', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.addPlayer('Bob'))
    expect(result.current.state.players.map((p) => p.name)).toEqual(['Alice', 'Bob'])

    const bobId = result.current.state.players[1].id
    act(() => result.current.removePlayer(bobId))
    expect(result.current.state.players.map((p) => p.name)).toEqual(['Alice'])
  })

  it('ignores blank player names', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('   '))
    expect(result.current.state.players).toHaveLength(0)
  })

  it('startGame deals round 1 and activates its joker', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())

    expect(result.current.state.stage).toBe('playing')
    expect(result.current.state.round).toBe(1)
    expect(result.current.state.activeJokers).toHaveLength(1)

    const expectedFirstCard = createShuffledDeck(fixedRandom)[0]
    expect(result.current.state.roundCard).toEqual(expectedFirstCard)
    expect(result.current.state.activeJokers[0].name).toBe(
      JOKER_TABLE[expectedFirstCard.rank].name,
    )
  })

  it('completing a turn banks the adjusted score and advances to the next player', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.addPlayer('Bob'))
    act(() => result.current.startGame())

    act(() => {
      result.current.throwDart(20)
      result.current.throwDart(20)
      result.current.throwDart(20)
    })

    expect(result.current.state.currentPlayerIndex).toBe(1)
    expect(result.current.state.currentTurnDarts).toHaveLength(0)
    expect(result.current.state.players[0].turns).toHaveLength(1)
    expect(result.current.state.players[0].turns[0].rawTotal).toBe(60)
    // Every joker effect only ever adds or multiplies by >= 1, so the
    // adjusted score can never come in under the raw total.
    expect(result.current.state.players[0].total).toBeGreaterThanOrEqual(60)
  })

  it('undo removes only the last dart of the in-progress turn', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())

    act(() => result.current.throwDart(20))
    act(() => result.current.throwDart(1))
    expect(result.current.state.currentTurnDarts).toHaveLength(2)

    act(() => result.current.undoDart())
    expect(result.current.state.currentTurnDarts).toHaveLength(1)
    expect(result.current.state.currentTurnDarts[0].segment).toBe(20)
    // Nothing is banked to the player's total until the 3rd dart of a turn.
    expect(result.current.state.players[0].total).toBe(0)
  })

  it('startGame/rematch are no-ops with no players', () => {
    // Not reachable through the UI (Start Game is disabled with no players)
    // — beginPlaying itself guards against it.
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.startGame())
    expect(result.current.state.stage).toBe('setup')

    act(() => result.current.rematch())
    expect(result.current.state.stage).toBe('setup')
  })

  it('startGame is a no-op if the deck is somehow empty from the start', () => {
    // Not reachable through real play (createShuffledDeck always returns a
    // full 52-card deck) — beginPlaying's own defensive guard.
    vi.mocked(drawCard).mockReturnValueOnce({ card: null, rest: [] })
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())
    expect(result.current.state.stage).toBe('setup')
  })

  it('setMultiplier toggles the same multiplier back off to 1', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())

    act(() => result.current.setMultiplier(3))
    expect(result.current.state.multiplier).toBe(3)

    act(() => result.current.setMultiplier(3))
    expect(result.current.state.multiplier).toBe(1)
  })

  it('throwDart is a no-op when not in the playing stage', () => {
    // Not reachable through the UI (the number pad only renders during
    // 'playing') — throwDart itself guards against it.
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.throwDart(20)) // still in 'setup' stage
    expect(result.current.state.currentTurnDarts).toHaveLength(0)
  })

  it('undo is a no-op with nothing thrown yet this turn', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())
    act(() => result.current.undoDart())
    expect(result.current.state.currentTurnDarts).toHaveLength(0)
  })

  it('finishes after 5 rounds, drawing exactly one card per round', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())

    act(() => {
      for (let round = 0; round < ROUNDS; round++) {
        result.current.throwDart(1)
        result.current.throwDart(1)
        result.current.throwDart(1)
      }
    })

    expect(result.current.state.stage).toBe('finished')
    expect(result.current.state.activeJokers).toHaveLength(ROUNDS)
    expect(result.current.state.players[0].turns).toHaveLength(ROUNDS)
  })

  it('rematch resets totals/turns for the same roster and reshuffles', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())
    act(() => {
      result.current.throwDart(20)
      result.current.throwDart(20)
      result.current.throwDart(20)
    })
    expect(result.current.state.players[0].total).toBeGreaterThan(0)

    act(() => result.current.rematch())
    expect(result.current.state.stage).toBe('playing')
    expect(result.current.state.round).toBe(1)
    expect(result.current.state.players[0].total).toBe(0)
    expect(result.current.state.players[0].turns).toHaveLength(0)
    expect(result.current.state.players.map((p) => p.name)).toEqual(['Alice'])
  })

  it('ends the game early if the deck unexpectedly runs out mid-game', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame()) // consumes the real (mocked-passthrough) initial draw

    // The next draw (round 1 -> round 2) reports the deck as empty, exercising
    // the defensive early-finish path without needing to exhaust all 52 cards
    // through real play.
    vi.mocked(drawCard).mockReturnValueOnce({ card: null, rest: [] })

    act(() => {
      result.current.throwDart(1)
      result.current.throwDart(1)
      result.current.throwDart(1)
    })

    expect(result.current.state.stage).toBe('finished')
    expect(result.current.state.round).toBe(1)
    expect(result.current.state.players[0].turns).toHaveLength(1)
  })

  it('newGame clears the roster back to setup', () => {
    const { result } = renderHook(() => useCardGame(fixedRandom))
    act(() => result.current.addPlayer('Alice'))
    act(() => result.current.startGame())

    act(() => result.current.newGame())
    expect(result.current.state.stage).toBe('setup')
    expect(result.current.state.players).toHaveLength(0)
  })
})
