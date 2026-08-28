const STORAGE_KEY = 'hdart:sound-settings'

export interface SoundSettings {
  soundEnabled: boolean
}

export const DEFAULT_SOUND_SETTINGS: SoundSettings = { soundEnabled: true }

export function isSoundSettings(value: unknown): value is SoundSettings {
  if (!value || typeof value !== 'object') return false
  const candidate = value as Partial<SoundSettings>
  return typeof candidate.soundEnabled === 'boolean'
}

export function loadSoundSettings(): unknown {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSoundSettings(settings: SoundSettings): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage unavailable (private browsing, quota, etc.) — sound preference
    // is a nice-to-have, so fail silently rather than breaking the app.
  }
}
