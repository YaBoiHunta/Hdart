import { describe, it, expect, beforeEach } from 'vitest'
import { loadHistory, appendGameResult, buildGameSummary } from './history'
import type { GameHistoryEntry, GameState } from './types'

beforeEach(() => {
  localStorage.clear()
})

function makeEntry(finishedAt: string): GameHistoryEntry {
  return {
    finishedAt,
    modeId: '501',
    modeLabel: '501',
    players: [{ name: 'Hunter', won: true, average: 42, turns: 3 }],
  }
}

describe('loadHistory', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns an empty array for corrupted data instead of throwing', () => {
    localStorage.setItem('hdart:history', 'not valid json{{{')
    expect(loadHistory()).toEqual([])
  })

  it('returns an empty array if the stored value is not an array', () => {
    localStorage.setItem('hdart:history', JSON.stringify({ not: 'an array' }))
    expect(loadHistory()).toEqual([])
  })

  it('drops malformed entries instead of returning them as-is', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        makeEntry('good-entry'),
        { finishedAt: 'missing-everything-else' },
        { finishedAt: 'bad-players', modeId: '501', modeLabel: '501', players: 'not-an-array' },
        null,
        'just a string',
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).toBe('good-entry')
  })
})

describe('appendGameResult', () => {
  it('prepends new entries, most recent first', () => {
    appendGameResult(makeEntry('first'))
    appendGameResult(makeEntry('second'))
    const history = loadHistory()
    expect(history).toHaveLength(2)
    expect(history[0].finishedAt).toBe('second')
    expect(history[1].finishedAt).toBe('first')
  })

  it('caps the list at 100 entries, dropping the oldest', () => {
    for (let i = 0; i < 105; i++) {
      appendGameResult(makeEntry(`game-${i}`))
    }
    const history = loadHistory()
    expect(history).toHaveLength(100)
    expect(history[0].finishedAt).toBe('game-104')
    expect(history[99].finishedAt).toBe('game-5')
  })
})

describe('buildGameSummary', () => {
  it('captures mode, winner, average, and turn count per player', () => {
    const state = {
      modeId: '501',
      winnerId: 1,
      players: [
        {
          id: 1,
          name: 'Hunter',
          turnHistory: [
            { throws: [], total: 60, bust: false },
            { throws: [], total: 40, bust: false },
          ],
        },
        {
          id: 2,
          name: 'Friend',
          turnHistory: [],
        },
      ],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.modeId).toBe('501')
    expect(summary.modeLabel).toBe('501')
    expect(typeof summary.finishedAt).toBe('string')

    const [hunter, friend] = summary.players
    expect(hunter).toMatchObject({ name: 'Hunter', won: true, average: 50, turns: 2 })
    expect(friend).toMatchObject({ name: 'Friend', won: false, average: null, turns: 0 })
  })
})
