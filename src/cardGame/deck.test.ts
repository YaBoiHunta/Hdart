import { describe, it, expect } from 'vitest'
import { createDeck, shuffleDeck, createShuffledDeck, drawCard, cardLabel, RANKS } from './deck'

describe('createDeck', () => {
  it('has 52 cards, 4 of each rank', () => {
    const deck = createDeck()
    expect(deck).toHaveLength(52)
    for (const rank of RANKS) {
      expect(deck.filter((c) => c.rank === rank)).toHaveLength(4)
    }
  })

  it('every card is unique (rank+suit)', () => {
    const deck = createDeck()
    const seen = new Set(deck.map((c) => `${c.rank}-${c.suit}`))
    expect(seen.size).toBe(52)
  })
})

describe('shuffleDeck', () => {
  it('preserves composition, just reorders', () => {
    const deck = createDeck()
    // Deterministic "random": always returns 0 so Fisher-Yates degenerates
    // to a fixed, reproducible permutation rather than a no-op.
    const shuffled = shuffleDeck(deck, () => 0)
    expect(shuffled).toHaveLength(52)
    expect(shuffled.map((c) => `${c.rank}-${c.suit}`).sort()).toEqual(
      deck.map((c) => `${c.rank}-${c.suit}`).sort(),
    )
  })

  it('does not mutate the input deck', () => {
    const deck = createDeck()
    const before = [...deck]
    shuffleDeck(deck, () => 0.5)
    expect(deck).toEqual(before)
  })
})

describe('createShuffledDeck', () => {
  it('is a full 52-card deck', () => {
    expect(createShuffledDeck(() => 0.5)).toHaveLength(52)
  })
})

describe('drawCard', () => {
  it('returns the top card and the rest', () => {
    const deck = createDeck()
    const { card, rest } = drawCard(deck)
    expect(card).toEqual(deck[0])
    expect(rest).toHaveLength(51)
  })

  it('returns null card on an empty deck', () => {
    const { card, rest } = drawCard([])
    expect(card).toBeNull()
    expect(rest).toEqual([])
  })
})

describe('cardLabel', () => {
  it('formats rank + suit symbol', () => {
    expect(cardLabel({ rank: 'A', suit: 'spades' })).toBe('A♠')
    expect(cardLabel({ rank: '10', suit: 'hearts' })).toBe('10♥')
  })
})
