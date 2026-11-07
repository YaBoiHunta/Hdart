import { useEffect, useRef, useState } from 'react'

const URGENT_SECONDS = 10

interface TurnTimerProps {
  seconds: number
  // Changing this restarts the countdown from `seconds` (a new turn began).
  resetKey: string
  onExpire: () => void
}

export function formatClock(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export default function TurnTimer({ seconds, resetKey, onExpire }: TurnTimerProps) {
  const [remaining, setRemaining] = useState(seconds)
  // Latest callback without restarting the interval on every render.
  const onExpireRef = useRef(onExpire)
  useEffect(() => {
    onExpireRef.current = onExpire
  }, [onExpire])

  useEffect(() => {
    // Deadline-based so a throttled/backgrounded tab can't make the clock drift.
    const deadline = Date.now() + seconds * 1000
    setRemaining(seconds)
    const id = setInterval(() => {
      const left = Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
      setRemaining(left)
      if (left === 0) {
        clearInterval(id)
        onExpireRef.current()
      }
    }, 250)
    return () => clearInterval(id)
  }, [seconds, resetKey])

  return (
    <div
      className={`turn-timer${remaining <= URGENT_SECONDS ? ' urgent' : ''}`}
      role="timer"
      aria-label="Time left this turn"
    >
      {formatClock(remaining)}
    </div>
  )
}
