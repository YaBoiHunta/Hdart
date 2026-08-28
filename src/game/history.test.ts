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
    highestRound: { total: 60, playerName: 'Hunter' },
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
        {
          finishedAt: 'bad-highest-round',
          modeId: '501',
          modeLabel: '501',
          players: [],
          highestRound: 'not-an-object',
        },
        null,
        'just a string',
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).toBe('good-entry')
  })

  it('tolerates entries saved before highestRound existed, normalizing it to null', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        {
          finishedAt: 'pre-feature-entry',
          modeId: '501',
          modeLabel: '501',
          players: [{ name: 'Hunter', won: true, average: 42, turns: 3 }],
          // no highestRound field at all — this is what history entries looked
          // like before the "highest round" stat was added.
        },
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].highestRound).toBeNull()
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

  it('captures the highest scoring round across all players in a countdown game', () => {
    const state = {
      modeId: '501',
      winnerId: 2,
      players: [
        {
          id: 1,
          name: 'Hunter',
          turnHistory: [
            { throws: [], total: 45, bust: false },
            { throws: [], total: 0, bust: true },
          ],
        },
        {
          id: 2,
          name: 'Friend',
          turnHistory: [{ throws: [], total: 140, bust: false }],
        },
      ],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.highestRound).toEqual({ total: 140, playerName: 'Friend' })
  })

  it('is null for a progression-family game, since "total" there means hits not points', () => {
    const state = {
      modeId: 'around-the-world',
      winnerId: 1,
      players: [
        {
          id: 1,
          name: 'Hunter',
          turnHistory: [{ throws: [], total: 3, bust: false }],
        },
      ],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.highestRound).toBeNull()
  })
})
