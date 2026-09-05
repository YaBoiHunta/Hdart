import { describe, it, expect } from 'vitest'
import { firstNAverage, worstTurn, bustRate, dartsThrown } from './stats'
import type { TurnHistoryEntry } from './types'

function turn(total: number, bust = false, dartCount = 3): TurnHistoryEntry {
  return {
    total,
    bust,
    throws: Array.from({ length: dartCount }, () => ({ segment: 20, multiplier: 1 as const, value: 20 })),
  }
}

describe('firstNAverage', () => {
  it('returns null when the player never got a turn', () => {
    expect(firstNAverage([])).toBeNull()
  })

  it('averages the first 3 turns by default', () => {
    const turns = [turn(60), turn(40), turn(20), turn(100)]
    expect(firstNAverage(turns)).toBe(40)
  })

  it('averages fewer than n turns when the player has not had that many yet', () => {
    const turns = [turn(60), turn(40)]
    expect(firstNAverage(turns)).toBe(50)
  })

  it('counts a bust turn as 0, matching turnAverage convention', () => {
    const turns = [turn(60), turn(0, true), turn(30)]
    expect(firstNAverage(turns)).toBe(30)
  })

  it('supports a custom n', () => {
    const turns = [turn(10), turn(20), turn(30), turn(40)]
    expect(firstNAverage(turns, 2)).toBe(15)
  })
})

describe('worstTurn', () => {
  it('returns null when there are no turns', () => {
    expect(worstTurn([])).toBeNull()
  })

  it('returns the lowest-total turn', () => {
    const turns = [turn(60), turn(20), turn(45)]
    expect(worstTurn(turns)).toEqual({ total: 20, bust: false })
  })

  it('treats a bust turn (total 0) as the worst', () => {
    const turns = [turn(60), turn(0, true), turn(45)]
    expect(worstTurn(turns)).toEqual({ total: 0, bust: true })
  })
})

describe('bustRate', () => {
  it('returns null when there are no turns', () => {
    expect(bustRate([])).toBeNull()
  })

  it('returns 0 when no turns busted', () => {
    const turns = [turn(60), turn(40)]
    expect(bustRate(turns)).toBe(0)
  })

  it('returns the fraction of turns that busted', () => {
    const turns = [turn(60), turn(0, true), turn(40), turn(0, true)]
    expect(bustRate(turns)).toBe(0.5)
  })

  it('returns 1 when every turn busted', () => {
    const turns = [turn(0, true), turn(0, true)]
    expect(bustRate(turns)).toBe(1)
  })
})

describe('dartsThrown', () => {
  it('returns 0 for no turns', () => {
    expect(dartsThrown([])).toBe(0)
  })

  it('sums darts across all turns, including a short final winning turn', () => {
    const turns = [turn(60, false, 3), turn(40, false, 3), turn(21, false, 1)]
    expect(dartsThrown(turns)).toBe(7)
  })
})
