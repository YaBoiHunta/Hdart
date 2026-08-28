import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import {
  DEFAULT_SOUND_SETTINGS,
  isSoundSettings,
  loadSoundSettings,
  saveSoundSettings,
  type SoundSettings,
} from './soundSettings'

// A plain string rather than a literal union of known names, so a new
// trigger can reference a sound file without a change here.
export type SoundName = string

interface SoundContextValue {
  soundEnabled: boolean
  toggleSound: () => void
  playSound: (name: SoundName) => void
}

const SoundContext = createContext<SoundContextValue | undefined>(undefined)

function initSoundSettings(): SoundSettings {
  const saved = loadSoundSettings()
  return isSoundSettings(saved) ? saved : DEFAULT_SOUND_SETTINGS
}

function soundUrl(name: SoundName): string {
  return `${import.meta.env.BASE_URL}sounds/${encodeURIComponent(name)}.mp3`
}

export function SoundProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<SoundSettings>(initSoundSettings)

  const toggleSound = useCallback(() => {
    setSettings((prev) => {
      const next = { ...prev, soundEnabled: !prev.soundEnabled }
      saveSoundSettings(next)
      return next
    })
  }, [])

  const playSound = useCallback(
    (name: SoundName) => {
      if (!settings.soundEnabled) return
      // A fresh Audio() per call (not a shared/reused element) so rapid
      // repeated triggers aren't cut off by a still-playing previous one.
      const audio = new Audio(soundUrl(name))
      // Best-effort: a missing asset or an autoplay restriction shouldn't
      // surface as an unhandled rejection.
      audio.play().catch(() => {})
    },
    [settings.soundEnabled],
  )

  const value = useMemo<SoundContextValue>(
    () => ({ soundEnabled: settings.soundEnabled, toggleSound, playSound }),
    [settings.soundEnabled, toggleSound, playSound],
  )

  return <SoundContext value={value}>{children}</SoundContext>
}

export function useSound(): SoundContextValue {
  const ctx = useContext(SoundContext)
  if (!ctx) throw new Error('useSound must be used within a SoundProvider')
  return ctx
}
