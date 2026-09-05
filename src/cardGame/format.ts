import type { CardGameDart } from './types'

export function formatCardDart(dart: CardGameDart): string {
  if (dart.segment === 'OUT') return 'OUT'
  if (dart.multiplier === 2) return `D${dart.segment}`
  if (dart.multiplier === 3) return `T${dart.segment}`
  return `${dart.segment}`
}
