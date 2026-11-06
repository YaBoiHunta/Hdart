import { describe, it, expect } from 'vitest'
import { GAME_MODES, getModeById } from './modes'

describe('GAME_MODES', () => {
  it('includes 301, 501 and 501 (Speed) as countdown modes', () => {
    const countdownIds = GAME_MODES.filter((m) => m.family === 'countdown').map((m) => m.id)
    expect(countdownIds).toEqual(['301', '501', '501-speed'])
  })

  it('makes 501 (Speed) a 501 with a 60 second turn limit', () => {
    const mode = getModeById('501-speed')
    expect(mode?.label).toBe('501 (Speed)')
    expect(mode?.family === 'countdown' && mode.startingScore).toBe(501)
    expect(mode?.family === 'countdown' && mode.turnTimeLimitSeconds).toBe(60)
  })

  it('includes Around the World as a progression mode ending on Bull', () => {
    const mode = GAME_MODES.find((m) => m.id === 'around-the-world')
    expect(mode?.family).toBe('progression')
    if (mode?.family === 'progression') {
      expect(mode.sequence[0]).toBe(1)
      expect(mode.sequence.at(-1)).toBe(25)
      expect(mode.sequence).toHaveLength(21)
    }
  })
})

describe('getModeById', () => {
  it('finds a mode by id', () => {
    expect(getModeById('501')?.label).toBe('501')
  })

  it('returns undefined for an unknown id', () => {
    expect(getModeById('cricket')).toBeUndefined()
  })

  it('returns undefined for null', () => {
    expect(getModeById(null)).toBeUndefined()
  })
})
