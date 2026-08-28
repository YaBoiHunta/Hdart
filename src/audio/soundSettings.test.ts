import { describe, it, expect, beforeEach } from 'vitest'
import { isSoundSettings, loadSoundSettings, saveSoundSettings } from './soundSettings'

beforeEach(() => {
  localStorage.clear()
})

describe('loadSoundSettings', () => {
  it('returns null when nothing is stored', () => {
    expect(loadSoundSettings()).toBeNull()
  })

  it('returns null for corrupted data instead of throwing', () => {
    localStorage.setItem('hdart:sound-settings', 'not valid json{{{')
    expect(loadSoundSettings()).toBeNull()
  })
})

describe('isSoundSettings', () => {
  it('rejects null, non-objects, and wrong-shaped values', () => {
    expect(isSoundSettings(null)).toBe(false)
    expect(isSoundSettings(undefined)).toBe(false)
    expect(isSoundSettings('sound')).toBe(false)
    expect(isSoundSettings({})).toBe(false)
    expect(isSoundSettings({ soundEnabled: 'yes' })).toBe(false)
  })

  it('accepts a valid shape', () => {
    expect(isSoundSettings({ soundEnabled: true })).toBe(true)
    expect(isSoundSettings({ soundEnabled: false })).toBe(true)
  })
})

describe('saveSoundSettings + loadSoundSettings', () => {
  it('round-trips a saved value', () => {
    saveSoundSettings({ soundEnabled: false })
    const loaded = loadSoundSettings()
    expect(isSoundSettings(loaded)).toBe(true)
    expect(loaded).toEqual({ soundEnabled: false })
  })
})
