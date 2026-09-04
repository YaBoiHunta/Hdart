import { describe, it, expect, beforeEach, vi } from 'vitest'
import { loadHistory, appendGameResult, buildGameSummary, exportHistoryJson, importHistory } from './history'
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

  it('tolerates entries saved before turnHistory existed, normalizing it to an empty array', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        {
          finishedAt: 'pre-feature-entry',
          modeId: '501',
          modeLabel: '501',
          players: [{ name: 'Hunter', won: true, average: 42, turns: 3 }],
          highestRound: null,
          // no turnHistory field on the player — pre-dates round expansion.
        },
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].players[0].turnHistory).toEqual([])
  })

  it('drops an entry whose players array contains a non-object entry', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([makeEntry('good-entry'), { finishedAt: 'null-player', modeId: '501', modeLabel: '501', players: [null] }]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).toBe('good-entry')
  })

  it('drops an entry whose turnHistory array contains a non-object entry', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        makeEntry('good-entry'),
        {
          finishedAt: 'null-turn',
          modeId: '501',
          modeLabel: '501',
          players: [{ name: 'Hunter', won: true, average: 42, turns: 1, turnHistory: [null] }],
          highestRound: null,
        },
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).toBe('good-entry')
  })

  it('drops an entry whose turnHistory throws array contains a non-object entry', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        makeEntry('good-entry'),
        {
          finishedAt: 'null-throw',
          modeId: '501',
          modeLabel: '501',
          players: [
            {
              name: 'Hunter',
              won: true,
              average: 42,
              turns: 1,
              turnHistory: [{ throws: [null], total: 0, bust: false }],
            },
          ],
          highestRound: null,
        },
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].finishedAt).toBe('good-entry')
  })

  it('accepts a turn history throw with an OUT segment', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        {
          finishedAt: 'with-out-dart',
          modeId: '501',
          modeLabel: '501',
          players: [
            {
              name: 'Hunter',
              won: true,
              average: 42,
              turns: 1,
              turnHistory: [{ throws: [{ segment: 'OUT', multiplier: 1, value: 0 }], total: 0, bust: false }],
            },
          ],
          highestRound: null,
        },
      ]),
    )
    const history = loadHistory()
    expect(history).toHaveLength(1)
    expect(history[0].players[0].turnHistory?.[0].throws[0].segment).toBe('OUT')
  })

  it('drops an entry with a malformed turnHistory', () => {
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        makeEntry('good-entry'),
        {
          finishedAt: 'bad-turn-history',
          modeId: '501',
          modeLabel: '501',
          players: [{ name: 'Hunter', won: true, average: 42, turns: 1, turnHistory: 'not-an-array' }],
          highestRound: null,
        },
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

describe('exportHistoryJson', () => {
  it('serializes the current history as JSON', () => {
    appendGameResult(makeEntry('game-1'))
    const json = exportHistoryJson()
    expect(JSON.parse(json)).toEqual(loadHistory())
  })
})

describe('importHistory', () => {
  it('adds new entries not already present', () => {
    appendGameResult(makeEntry('existing'))
    const result = importHistory([makeEntry('existing'), makeEntry('new-one')])
    expect(result).toEqual({ added: 1, skipped: 1 })
    const history = loadHistory()
    expect(history.map((e) => e.finishedAt).sort()).toEqual(['existing', 'new-one'])
  })

  it('is idempotent — importing the same file twice adds nothing the second time', () => {
    importHistory([makeEntry('a'), makeEntry('b')])
    const result = importHistory([makeEntry('a'), makeEntry('b')])
    expect(result).toEqual({ added: 0, skipped: 2 })
    expect(loadHistory()).toHaveLength(2)
  })

  it('drops malformed entries and only reports valid ones in added/skipped counts', () => {
    const result = importHistory([makeEntry('good'), { finishedAt: 'bad' }, 'not an entry', null])
    expect(result).toEqual({ added: 1, skipped: 0 })
    expect(loadHistory()).toHaveLength(1)
  })

  it('returns zero counts when given non-array input', () => {
    expect(importHistory({ not: 'an array' })).toEqual({ added: 0, skipped: 0 })
    expect(importHistory(null)).toEqual({ added: 0, skipped: 0 })
  })

  it('keeps the merged list sorted newest-first and capped at 100', () => {
    for (let i = 0; i < 60; i++) appendGameResult(makeEntry(`existing-${i}`))
    const incoming = Array.from({ length: 60 }, (_, i) => makeEntry(`imported-${i}`))
    const result = importHistory(incoming)
    expect(result.added).toBe(60)
    const history = loadHistory()
    expect(history).toHaveLength(100)
  })

  it('reports zero added when storage write fails, rather than throwing', () => {
    const setItemSpy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('quota exceeded')
      })
    const result = importHistory([makeEntry('a'), makeEntry('b')])
    expect(result).toEqual({ added: 0, skipped: 2 })
    setItemSpy.mockRestore()
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

  it('captures each player full turn history for round-by-round detail', () => {
    const turnHistory = [
      { throws: [{ segment: 20, multiplier: 3, value: 60 }], total: 60, bust: false, startScore: 501, startTargetIndex: 0 },
    ]
    const state = {
      modeId: '501',
      winnerId: 1,
      players: [{ id: 1, name: 'Hunter', turnHistory }],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.players[0].turnHistory).toEqual(turnHistory)
  })

  it('falls back to the raw modeId as the label when the mode cannot be resolved', () => {
    const state = {
      modeId: 'not-a-real-mode',
      winnerId: 1,
      players: [{ id: 1, name: 'Hunter', turnHistory: [] }],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.modeLabel).toBe('not-a-real-mode')
  })

  it('falls back to an empty label when there is no mode and no modeId', () => {
    const state = {
      modeId: null,
      winnerId: 1,
      players: [{ id: 1, name: 'Hunter', turnHistory: [] }],
    } as unknown as GameState

    const summary = buildGameSummary(state)
    expect(summary.modeLabel).toBe('')
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
