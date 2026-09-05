import type { CardGamePlayer } from './types'

export interface CardStanding {
  player: CardGamePlayer
  place: number
}

// Highest total first. Equal totals share the same place (standard
// competition ranking — 1st, 1st, 3rd), matching the "share the placement"
// tie-break decided for this mode.
export function getCardStandings(players: CardGamePlayer[]): CardStanding[] {
  const sorted = [...players].sort((a, b) => b.total - a.total)
  let place = 0
  return sorted.map((player, i) => {
    if (i === 0 || player.total !== sorted[i - 1].total) place = i + 1
    return { player, place }
  })
}
