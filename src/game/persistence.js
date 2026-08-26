const STORAGE_KEY = 'hdart:game-state'

export function loadPersistedState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function savePersistedState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — persistence is
    // a nice-to-have, so fail silently rather than breaking the game.
  }
}
