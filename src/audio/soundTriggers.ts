import type { Multiplier, ThrowRecord, ThrowSegment } from '../game/types'

function isBigTriple(segment: ThrowSegment, multiplier: Multiplier): boolean {
  return multiplier === 3 && typeof segment === 'number' && segment > 10
}

// True the instant a turn's *second* triple above 10 lands (e.g. triple-16
// then triple-20) — fires exactly once per turn, right when the pair
// completes, not again if a third big triple follows.
export function shouldPlayImpressMe(
  throwsSoFar: ThrowRecord[],
  segment: ThrowSegment,
  multiplier: Multiplier,
): boolean {
  if (!isBigTriple(segment, multiplier)) return false
  const priorBigTriples = throwsSoFar.filter((t) => isBigTriple(t.segment, t.multiplier)).length
  return priorBigTriples === 1
}
