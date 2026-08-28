import type { ThrowRecord } from './types'

export function formatThrow(t: ThrowRecord): string {
  if (t.segment === 'OUT') return 'OUT'
  if (t.multiplier === 2) return `D${t.segment}`
  if (t.multiplier === 3) return `T${t.segment}`
  return `${t.segment}`
}
