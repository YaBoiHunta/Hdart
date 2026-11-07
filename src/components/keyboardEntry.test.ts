import { describe, it, expect } from 'vitest'
import { appendDigit, resolveSegment } from './keyboardEntry'

describe('appendDigit', () => {
  it('appends while the result is still a valid number', () => {
    expect(appendDigit('', '2', true)).toBe('2')
    expect(appendDigit('2', '0', true)).toBe('20')
    expect(appendDigit('2', '5', true)).toBe('25')
    expect(appendDigit('5', '0', true)).toBe('50')
  })

  it('starts a new number when the result would be invalid', () => {
    expect(appendDigit('20', '5', true)).toBe('5') // third digit
    expect(appendDigit('3', '5', true)).toBe('5') // 35 isn't on the board
    expect(appendDigit('0', '5', true)).toBe('5') // no leading zeros
  })

  it('treats 50 as invalid when the bullseye is not allowed', () => {
    expect(appendDigit('5', '0', false)).toBe('0')
  })
})

describe('resolveSegment', () => {
  it('resolves board numbers 1–20 and 25', () => {
    expect(resolveSegment('5', true)).toBe(5)
    expect(resolveSegment('20', true)).toBe(20)
    expect(resolveSegment('25', true)).toBe(25)
  })

  it('resolves 0 to OUT', () => {
    expect(resolveSegment('0', true)).toBe('OUT')
  })

  it('resolves 50 only when the bullseye is allowed', () => {
    expect(resolveSegment('50', true)).toBe(50)
    expect(resolveSegment('50', false)).toBeNull()
  })

  it('rejects empty, out-of-range, and leading-zero buffers', () => {
    expect(resolveSegment('', true)).toBeNull()
    expect(resolveSegment('21', true)).toBeNull()
    expect(resolveSegment('35', true)).toBeNull()
    expect(resolveSegment('05', true)).toBeNull()
    expect(resolveSegment('200', true)).toBeNull()
  })
})
