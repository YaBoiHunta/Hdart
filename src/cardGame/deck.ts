import type { Card, Rank, Suit } from './types'

export const RANKS: Rank[] = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A']
const SUITS: Suit[] = ['spades', 'hearts', 'diamonds', 'clubs']

export function createDeck(): Card[] {
  const deck: Card[] = []
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ rank, suit })
    }
  }
  return deck
}

// Fisher-Yates. Takes an injectable `random` (defaults to Math.random) so
// tests can pass a seeded generator for deterministic draw order.
export function shuffleDeck(deck: Card[], random: () => number = Math.random): Card[] {
  const shuffled = [...deck]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

export function createShuffledDeck(random: () => number = Math.random): Card[] {
  return shuffleDeck(createDeck(), random)
}

// Draws the top card, returning it alongside the remaining deck. Returns
// null for `card` if the deck is empty (shouldn't happen in a 5-round game
// drawing from 52 cards, but keeps this honest rather than throwing).
export function drawCard(deck: Card[]): { card: Card | null; rest: Card[] } {
  if (deck.length === 0) return { card: null, rest: deck }
  const [card, ...rest] = deck
  return { card, rest }
}

export function cardLabel(card: Card): string {
  const suitSymbol = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }[card.suit]
  return `${card.rank}${suitSymbol}`
}
