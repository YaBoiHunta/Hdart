import type { Mode } from './types'

const AROUND_THE_WORLD_SEQUENCE = [...Array.from({ length: 20 }, (_, i) => i + 1), 25]

export const GAME_MODES: Mode[] = [
  { id: '301', label: '301', family: 'countdown', startingScore: 301 },
  { id: '501', label: '501', family: 'countdown', startingScore: 501 },
  {
    id: 'around-the-world',
    label: 'Around the World',
    family: 'progression',
    sequence: AROUND_THE_WORLD_SEQUENCE,
  },
]

export function getModeById(id: string | null): Mode | undefined {
  return GAME_MODES.find((mode) => mode.id === id)
}
