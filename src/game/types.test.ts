import { describe, it, expect } from 'vitest'
import { isCountdownPlayer, isProgressionPlayer } from './types'
import type { CountdownPlayer, ProgressionPlayer } from './types'

const countdownPlayer: CountdownPlayer = {
  id: 1,
  name: 'Hunter',
  score: 501,
  turnHistory: [],
}

const progressionPlayer: ProgressionPlayer = {
  id: 2,
  name: 'Friend',
  targetIndex: 0,
  turnHistory: [],
}

describe('isCountdownPlayer', () => {
  it('is true for a player with a score', () => {
    expect(isCountdownPlayer(countdownPlayer)).toBe(true)
  })

  it('is false for a player with a targetIndex instead', () => {
    expect(isCountdownPlayer(progressionPlayer)).toBe(false)
  })
})

describe('isProgressionPlayer', () => {
  it('is true for a player with a targetIndex', () => {
    expect(isProgressionPlayer(progressionPlayer)).toBe(true)
  })

  it('is false for a player with a score instead', () => {
    expect(isProgressionPlayer(countdownPlayer)).toBe(false)
  })
})
