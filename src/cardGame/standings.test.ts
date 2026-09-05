import { describe, it, expect } from 'vitest'
import { getCardStandings } from './standings'
import type { CardGamePlayer } from './types'

function player(id: number, name: string, total: number): CardGamePlayer {
  return { id, name, total, turns: [] }
}

describe('getCardStandings', () => {
  it('returns an empty list for no players', () => {
    expect(getCardStandings([])).toEqual([])
  })

  it('orders distinct totals highest first with sequential places', () => {
    const players = [player(1, 'Alice', 100), player(2, 'Bob', 300), player(3, 'Carl', 200)]
    const standings = getCardStandings(players)
    expect(standings.map((s) => [s.player.name, s.place])).toEqual([
      ['Bob', 1],
      ['Carl', 2],
      ['Alice', 3],
    ])
  })

  it('gives tied players the same place and skips the next place', () => {
    const players = [player(1, 'Alice', 100), player(2, 'Bob', 100), player(3, 'Carl', 50)]
    const standings = getCardStandings(players)
    expect(standings.map((s) => s.place)).toEqual([1, 1, 3])
  })

  it('gives every player 1st when all totals are tied', () => {
    const players = [player(1, 'Alice', 50), player(2, 'Bob', 50), player(3, 'Carl', 50)]
    const standings = getCardStandings(players)
    expect(standings.every((s) => s.place === 1)).toBe(true)
  })

  it('handles a tie in the middle of the pack', () => {
    const players = [
      player(1, 'Alice', 300),
      player(2, 'Bob', 200),
      player(3, 'Carl', 200),
      player(4, 'Dee', 100),
    ]
    const standings = getCardStandings(players)
    expect(standings.map((s) => [s.player.name, s.place])).toEqual([
      ['Alice', 1],
      ['Bob', 2],
      ['Carl', 2],
      ['Dee', 4],
    ])
  })

  it('does not mutate the input array', () => {
    const players = [player(1, 'Alice', 100), player(2, 'Bob', 300)]
    const before = [...players]
    getCardStandings(players)
    expect(players).toEqual(before)
  })

  it('a single player is always 1st', () => {
    const standings = getCardStandings([player(1, 'Alice', 0)])
    expect(standings).toEqual([{ player: player(1, 'Alice', 0), place: 1 }])
  })
})
