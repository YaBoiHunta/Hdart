import { turnAverage } from './gameReducer'
import { getModeById } from './modes'
import type { GameHistoryEntry, GameHistoryPlayerSummary, GameState } from './types'

const STORAGE_KEY = 'hdart:history'
const MAX_ENTRIES = 100

function isGameHistoryPlayerSummary(value: unknown): value is GameHistoryPlayerSummary {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<GameHistoryPlayerSummary>
  return (
    typeof p.name === 'string' &&
    typeof p.won === 'boolean' &&
    (p.average === null || typeof p.average === 'number') &&
    typeof p.turns === 'number'
  )
}

function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<GameHistoryEntry>
  return (
    typeof entry.finishedAt === 'string' &&
    typeof entry.modeLabel === 'string' &&
    (entry.modeId === null || typeof entry.modeId === 'string') &&
    Array.isArray(entry.players) &&
    entry.players.every(isGameHistoryPlayerSummary)
  )
}

export function buildGameSummary(state: GameState): GameHistoryEntry {
  const mode = getModeById(state.modeId)
  return {
    finishedAt: new Date().toISOString(),
    modeId: state.modeId,
    modeLabel: mode ? mode.label : (state.modeId ?? ''),
    players: state.players.map((p) => ({
      name: p.name,
      won: p.id === state.winnerId,
      average: turnAverage(p),
      turns: p.turnHistory.length,
    })),
  }
}

export function loadHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed.filter(isGameHistoryEntry) : []
  } catch {
    return []
  }
}

export function appendGameResult(entry: GameHistoryEntry): void {
  try {
    const history = [entry, ...loadHistory()].slice(0, MAX_ENTRIES)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — history is a
    // nice-to-have, so fail silently rather than breaking the game.
  }
}
