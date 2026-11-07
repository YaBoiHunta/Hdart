import type { ThrowSegment } from '../game/types'

/**
 * Pure helpers for desktop keyboard entry on the number pad.
 * The pending-number buffer is a string of typed digits (e.g. "2", "20").
 */

/**
 * Turn a typed buffer into the segment it would throw, or null if the buffer
 * isn't a throwable segment yet (empty, or not a real board number).
 * Valid: 0 (a miss, same as OUT), 1–20, 25, and 50 (countdown modes only).
 */
export function resolveSegment(buffer: string, allowBullseye: boolean): ThrowSegment | null {
  if (!/^\d{1,2}$/.test(buffer)) return null
  const n = Number(buffer)
  if (String(n) !== buffer) return null // rejects leading zeros like "05"
  if (n === 0) return 'OUT'
  if ((n >= 1 && n <= 20) || n === 25) return n
  if (n === 50 && allowBullseye) return 50
  return null
}

/**
 * Decide what the buffer becomes when the user types one more digit.
 *
 * If appending keeps a valid number ("2" + "0" → "20"), it's appended. If it
 * would make an impossible number (e.g. "3" + "5" → 35, or a 3rd digit after
 * "20"), the new digit starts a fresh number instead, so typing flows straight
 * into the next dart's score without needing Backspace/Escape.
 */
export function appendDigit(buffer: string, digit: string, allowBullseye: boolean): string {
  const next = buffer + digit
  return resolveSegment(next, allowBullseye) !== null ? next : digit
}
