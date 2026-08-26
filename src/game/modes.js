export const GAME_MODES = [
  { id: '301', label: '301', startingScore: 301 },
  { id: '501', label: '501', startingScore: 501 },
]

export function getModeById(id) {
  return GAME_MODES.find((mode) => mode.id === id)
}
