import { describe, it, expect } from 'vitest'
import { formatCardDart } from './format'
import type { CardGameDart } from './types'

function dart(overrides: Partial<CardGameDart>): CardGameDart {
  return { segment: 20, multiplier: 1, value: 20, ...overrides }
}

describe('formatCardDart', () => {
  it('formats a plain single as just the segment', () => {
    expect(formatCardDart(dart({ segment: 20, multiplier: 1, value: 20 }))).toBe('20')
  })

  it('formats a double with a D prefix', () => {
    expect(formatCardDart(dart({ segment: 20, multiplier: 2, value: 40 }))).toBe('D20')
  })

  it('formats a triple with a T prefix', () => {
    expect(formatCardDart(dart({ segment: 20, multiplier: 3, value: 60 }))).toBe('T20')
  })

  it('formats a miss as OUT regardless of multiplier', () => {
    expect(formatCardDart(dart({ segment: 'OUT', multiplier: 1, value: 0 }))).toBe('OUT')
  })
})
