import type { GameState } from './types'

const STORAGE_KEY = 'hdart:game-state'

export function loadPersistedState(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePersistedState(state: GameState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — persistence is
    // a nice-to-have, so fail silently rather than breaking the game.
  }
}
