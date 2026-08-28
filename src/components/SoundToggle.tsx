import { useSound } from '../audio/SoundContext'

export default function SoundToggle() {
  const { soundEnabled, toggleSound } = useSound()
  return (
    <button
      className="sound-toggle"
      onClick={toggleSound}
      aria-label={soundEnabled ? 'Mute sound' : 'Unmute sound'}
      aria-pressed={!soundEnabled}
    >
      {soundEnabled ? '🔊' : '🔇'}
    </button>
  )
}
