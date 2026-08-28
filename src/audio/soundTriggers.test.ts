import { describe, it, expect } from 'vitest'
import { shouldPlayImpressMe } from './soundTriggers'
import type { ThrowRecord } from '../game/types'

function throwRecord(segment: ThrowRecord['segment'], multiplier: ThrowRecord['multiplier']): ThrowRecord {
  return { segment, multiplier, value: segment === 'OUT' ? 0 : segment * multiplier }
}

describe('shouldPlayImpressMe', () => {
  it('is false on the first big triple of a turn', () => {
    expect(shouldPlayImpressMe([], 16, 3)).toBe(false)
  })

  it('is true the moment a second big triple lands', () => {
    const throwsSoFar = [throwRecord(16, 3)]
    expect(shouldPlayImpressMe(throwsSoFar, 20, 3)).toBe(true)
  })

  it('is false again for a third big triple in the same turn', () => {
    const throwsSoFar = [throwRecord(16, 3), throwRecord(20, 3)]
    expect(shouldPlayImpressMe(throwsSoFar, 11, 3)).toBe(false)
  })

  it('ignores triples at or below 10', () => {
    const throwsSoFar = [throwRecord(10, 3)]
    expect(shouldPlayImpressMe(throwsSoFar, 9, 3)).toBe(false)
  })

  it('ignores non-triple big numbers', () => {
    const throwsSoFar = [throwRecord(16, 2)]
    expect(shouldPlayImpressMe(throwsSoFar, 20, 2)).toBe(false)
  })

  it('ignores OUT throws', () => {
    const throwsSoFar = [throwRecord(16, 3)]
    expect(shouldPlayImpressMe(throwsSoFar, 'OUT', 1)).toBe(false)
  })

  it('a mix of one big triple and one small triple does not count', () => {
    const throwsSoFar = [throwRecord(5, 3)]
    expect(shouldPlayImpressMe(throwsSoFar, 20, 3)).toBe(false)
  })
})
