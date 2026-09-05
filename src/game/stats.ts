import type { TurnHistoryEntry } from './types'

/** Mean of `total` over the first `n` completed turns (bust counts as 0, matching `turnAverage`). */
export function firstNAverage(turnHistory: TurnHistoryEntry[], n = 3): number | null {
  if (turnHistory.length === 0) return null
  const turns = turnHistory.slice(0, n)
  const sum = turns.reduce((acc, t) => acc + t.total, 0)
  return sum / turns.length
}

/** The lowest-scoring completed turn (a bust naturally qualifies, since its total is 0). */
export function worstTurn(turnHistory: TurnHistoryEntry[]): { total: number; bust: boolean } | null {
  if (turnHistory.length === 0) return null
  const worst = turnHistory.reduce((worst, t) => (t.total < worst.total ? t : worst))
  return { total: worst.total, bust: worst.bust }
}

/** Fraction of completed turns that busted. */
export function bustRate(turnHistory: TurnHistoryEntry[]): number | null {
  if (turnHistory.length === 0) return null
  const busts = turnHistory.filter((t) => t.bust).length
  return busts / turnHistory.length
}

/** Total darts thrown across all completed turns. */
export function dartsThrown(turnHistory: TurnHistoryEntry[]): number {
  return turnHistory.reduce((acc, t) => acc + t.throws.length, 0)
}
