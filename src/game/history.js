import { turnAverage } from './gameReducer'
import { getModeById } from './modes'

const STORAGE_KEY = 'hdart:history'
const MAX_ENTRIES = 100

export function buildGameSummary(state) {
  const mode = getModeById(state.modeId)
  return {
    finishedAt: new Date().toISOString(),
    modeId: state.modeId,
    modeLabel: mode ? mode.label : state.modeId,
    players: state.players.map((p) => ({
      name: p.name,
      won: p.id === state.winnerId,
      average: turnAverage(p),
      turns: p.turnHistory.length,
    })),
  }
}

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function appendGameResult(entry) {
  try {
    const history = [entry, ...loadHistory()].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — history is a
    // nice-to-have, so fail silently rather than breaking the game.
  }
}
