// Types for the standalone "Joker Draw" card game prototype.
//
// This mode is intentionally kept separate from src/game/ (the shared
// gameReducer.ts / useReducer engine that 301, 501, and Around the World run
// on). It has its own state, its own scoring math, and its own screen — the
// standard modes' reducer and types never need to know it exists.

export type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | 'J' | 'Q' | 'K' | 'A'
export type Suit = 'spades' | 'hearts' | 'diamonds' | 'clubs'

export interface Card {
  rank: Rank
  suit: Suit
}

export type CardDartMultiplier = 1 | 2 | 3
export type CardDartSegment = number | 'OUT'

export interface CardGameDart {
  segment: CardDartSegment
  multiplier: CardDartMultiplier
  value: number
}

// Only-what-happened-this-round facts a joker's effect can key off of.
// Bull (25 or 50) is its own category, distinct from single/double/triple,
// regardless of what multiplier was applied to it.
export interface RoundSummary {
  darts: CardGameDart[]
  rawTotal: number
  singleCount: number
  doubleCount: number
  tripleCount: number
  bullCount: number
  missCount: number
  hasExactBullseye: boolean
}

export type JokerEffect =
  | { kind: 'perSingle'; amount: number }
  | { kind: 'perDouble'; amount: number }
  | { kind: 'perTriple'; amount: number }
  | { kind: 'perBull'; amount: number }
  | { kind: 'noMissFlat'; amount: number }
  | { kind: 'noMissMult'; factor: number }
  | { kind: 'exactBullseyeFlat'; amount: number }
  | { kind: 'doubleAndTripleFlat'; amount: number }
  | { kind: 'allMissFlat'; amount: number }
  | { kind: 'totalThresholdMult'; threshold: number; factor: number }
  | { kind: 'tripleCountMult'; minCount: number; factor: number }
  | { kind: 'allMultiplierDartsMult'; factor: number }

export interface JokerDefinition {
  rank: Rank
  name: string
  description: string
  effect: JokerEffect
}

// A joker that has been drawn and is now permanently active, in draw order.
export interface ActiveJoker extends JokerDefinition {
  card: Card
}

export interface CardTurnRecord {
  round: number
  darts: CardGameDart[]
  rawTotal: number
  adjustedTotal: number
}

export interface CardGamePlayer {
  id: number
  name: string
  total: number
  turns: CardTurnRecord[]
}

export type CardGameStage = 'setup' | 'playing' | 'finished'

export interface CardGameState {
  stage: CardGameStage
  players: CardGamePlayer[]
  deck: Card[]
  round: number // 1-5 once playing
  activeJokers: ActiveJoker[]
  roundCard: Card | null // the card revealed for the current round
  currentPlayerIndex: number
  currentTurnDarts: CardGameDart[]
  multiplier: CardDartMultiplier
}
