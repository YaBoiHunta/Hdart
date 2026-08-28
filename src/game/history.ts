import { turnAverage } from './gameReducer'
import { getModeById } from './modes'
import type {
  GameHistoryEntry,
  GameHistoryHighestRound,
  GameHistoryPlayerSummary,
  GameState,
  ThrowRecord,
  TurnHistoryEntry,
} from './types'

const STORAGE_KEY = 'hdart:history'
const MAX_ENTRIES = 100

function isThrowRecord(value: unknown): value is ThrowRecord {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<ThrowRecord>
  return (
    (typeof t.segment === 'number' || t.segment === 'OUT') &&
    (t.multiplier === 1 || t.multiplier === 2 || t.multiplier === 3) &&
    typeof t.value === 'number'
  )
}

function isTurnHistoryEntry(value: unknown): value is TurnHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const t = value as Partial<TurnHistoryEntry>
  return Array.isArray(t.throws) && t.throws.every(isThrowRecord) && typeof t.total === 'number' && typeof t.bust === 'boolean'
}

function isGameHistoryPlayerSummary(value: unknown): value is GameHistoryPlayerSummary {
  if (!value || typeof value !== 'object') return false
  const p = value as Partial<GameHistoryPlayerSummary>
  return (
    typeof p.name === 'string' &&
    typeof p.won === 'boolean' &&
    (p.average === null || typeof p.average === 'number') &&
    typeof p.turns === 'number' &&
    // turnHistory predates this field — entries saved before it shipped
    // won't have it at all, so treat "missing" as valid (normalized to []
    // below), rather than dropping otherwise-valid history entries.
    (p.turnHistory === undefined || (Array.isArray(p.turnHistory) && p.turnHistory.every(isTurnHistoryEntry)))
  )
}

function isGameHistoryHighestRound(value: unknown): value is GameHistoryHighestRound {
  if (!value || typeof value !== 'object') return false
  const h = value as Partial<GameHistoryHighestRound>
  return typeof h.total === 'number' && typeof h.playerName === 'string'
}

function isGameHistoryEntry(value: unknown): value is GameHistoryEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<GameHistoryEntry>
  return (
    typeof entry.finishedAt === 'string' &&
    typeof entry.modeLabel === 'string' &&
    (entry.modeId === null || typeof entry.modeId === 'string') &&
    Array.isArray(entry.players) &&
    entry.players.every(isGameHistoryPlayerSummary) &&
    // highestRound predates this field — entries saved before it shipped
    // won't have it at all, so treat "missing" the same as "null" rather
    // than dropping otherwise-valid history entries.
    (entry.highestRound === undefined ||
      entry.highestRound === null ||
      isGameHistoryHighestRound(entry.highestRound))
  )
}

function computeHighestRound(state: GameState, mode: ReturnType<typeof getModeById>): GameHistoryHighestRound | null {
  if (!mode || mode.family !== 'countdown') return null
  let best: GameHistoryHighestRound | null = null
  for (const p of state.players) {
    for (const t of p.turnHistory) {
      if (!best || t.total > best.total) best = { total: t.total, playerName: p.name }
    }
  }
  return best
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
      turnHistory: p.turnHistory,
    })),
    highestRound: computeHighestRound(state, mode),
  }
}

export function loadHistory(): GameHistoryEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed)
      ? parsed
          .filter(isGameHistoryEntry)
          .map((e) => ({
            ...e,
            highestRound: e.highestRound ?? null,
            players: e.players.map((p) => ({ ...p, turnHistory: p.turnHistory ?? [] })),
          }))
      : []
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
