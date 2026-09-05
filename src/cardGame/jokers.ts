import type { CardGameDart, JokerDefinition, JokerEffect, Rank, RoundSummary } from './types'

// A dart counts as "bull" (25 or 50) regardless of what multiplier was
// applied to it — bull and single/double/triple are mutually exclusive
// categories for joker purposes, so a doubled 25 (worth 50) is a bull hit,
// not also a double.
function classifyDart(dart: CardGameDart): 'miss' | 'bull' | 'single' | 'double' | 'triple' {
  if (dart.segment === 'OUT') return 'miss'
  if (dart.segment === 25 || dart.segment === 50) return 'bull'
  if (dart.multiplier === 2) return 'double'
  if (dart.multiplier === 3) return 'triple'
  return 'single'
}

export function summarizeRound(darts: CardGameDart[]): RoundSummary {
  const summary: RoundSummary = {
    darts,
    rawTotal: darts.reduce((sum, d) => sum + d.value, 0),
    singleCount: 0,
    doubleCount: 0,
    tripleCount: 0,
    bullCount: 0,
    missCount: 0,
    hasExactBullseye: darts.some((d) => d.segment === 50),
  }
  for (const dart of darts) {
    switch (classifyDart(dart)) {
      case 'single':
        summary.singleCount++
        break
      case 'double':
        summary.doubleCount++
        break
      case 'triple':
        summary.tripleCount++
        break
      case 'bull':
        summary.bullCount++
        break
      case 'miss':
        summary.missCount++
        break
    }
  }
  return summary
}

export function applyJokerEffect(score: number, summary: RoundSummary, effect: JokerEffect): number {
  switch (effect.kind) {
    case 'perSingle':
      return score + effect.amount * summary.singleCount
    case 'perDouble':
      return score + effect.amount * summary.doubleCount
    case 'perTriple':
      return score + effect.amount * summary.tripleCount
    case 'perBull':
      return score + effect.amount * summary.bullCount
    case 'noMissFlat':
      return summary.missCount === 0 ? score + effect.amount : score
    case 'noMissMult':
      return summary.missCount === 0 ? score * effect.factor : score
    case 'exactBullseyeFlat':
      return summary.hasExactBullseye ? score + effect.amount : score
    case 'doubleAndTripleFlat':
      return summary.doubleCount > 0 && summary.tripleCount > 0 ? score + effect.amount : score
    case 'allMissFlat':
      return summary.missCount === summary.darts.length ? score + effect.amount : score
    case 'totalThresholdMult':
      return summary.rawTotal >= effect.threshold ? score * effect.factor : score
    case 'tripleCountMult':
      return summary.tripleCount >= effect.minCount ? score * effect.factor : score
    case 'allMultiplierDartsMult':
      return summary.singleCount === 0 && summary.bullCount === 0 && summary.missCount === 0
        ? score * effect.factor
        : score
  }
}

// Runs a round's raw dart total through every active joker, strictly in the
// order they were drawn — no interaction/priority rules between jokers, just
// a plain sequential add-then-multiply-then-add... walk, exactly matching
// the order the cards came up in.
export function applyActiveJokers(
  rawTotal: number,
  summary: RoundSummary,
  activeJokers: { effect: JokerEffect }[],
): number {
  let score = rawTotal
  for (const joker of activeJokers) {
    score = applyJokerEffect(score, summary, joker.effect)
  }
  return score
}

export const JOKER_TABLE: Record<Rank, JokerDefinition> = {
  '2': {
    rank: '2',
    name: 'Warm-Up',
    description: '+1 for every Single hit this round',
    effect: { kind: 'perSingle', amount: 1 },
  },
  '3': {
    rank: '3',
    name: 'Steady Hand',
    description: '+3 if you had no misses this round',
    effect: { kind: 'noMissFlat', amount: 3 },
  },
  '4': {
    rank: '4',
    name: 'Double Down',
    description: '+4 for every Double hit this round',
    effect: { kind: 'perDouble', amount: 4 },
  },
  '5': {
    rank: '5',
    name: 'High Five',
    description: '+5 for every 25/Bullseye hit this round',
    effect: { kind: 'perBull', amount: 5 },
  },
  '6': {
    rank: '6',
    name: 'Hot Streak',
    description: '+6 for every Triple hit this round',
    effect: { kind: 'perTriple', amount: 6 },
  },
  '7': {
    rank: '7',
    name: 'Lucky Seven',
    description: '+7 if you hit the exact 50 Bullseye this round',
    effect: { kind: 'exactBullseyeFlat', amount: 7 },
  },
  '8': {
    rank: '8',
    name: 'Full House',
    description: '+8 if you landed at least one Double and one Triple this round',
    effect: { kind: 'doubleAndTripleFlat', amount: 8 },
  },
  '9': {
    rank: '9',
    name: 'Underdog',
    description: '+20 if all 3 darts missed this round',
    effect: { kind: 'allMissFlat', amount: 20 },
  },
  '10': {
    rank: '10',
    name: 'Perfect Ten',
    description: '×1.5 if you had no misses this round',
    effect: { kind: 'noMissMult', factor: 1.5 },
  },
  J: {
    rank: 'J',
    name: 'Jack of Triples',
    description: '+10 for every Triple hit this round',
    effect: { kind: 'perTriple', amount: 10 },
  },
  Q: {
    rank: 'Q',
    name: "Queen's Gambit",
    description: '×2 if your raw round total was 100 or more',
    effect: { kind: 'totalThresholdMult', threshold: 100, factor: 2 },
  },
  K: {
    rank: 'K',
    name: "King's Decree",
    description: '×2 if you hit 2 or more Triples this round',
    effect: { kind: 'tripleCountMult', minCount: 2, factor: 2 },
  },
  A: {
    rank: 'A',
    name: 'Ace High',
    description: '×3 if every dart this round was a Double or Triple',
    effect: { kind: 'allMultiplierDartsMult', factor: 3 },
  },
}
