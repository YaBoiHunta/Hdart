import { describe, it, expect } from 'vitest'
import { ordinal } from './ordinal'

describe('ordinal', () => {
  it('formats 1st/2nd/3rd', () => {
    expect(ordinal(1)).toBe('1st')
    expect(ordinal(2)).toBe('2nd')
    expect(ordinal(3)).toBe('3rd')
  })

  it('formats everything else with "th"', () => {
    expect(ordinal(4)).toBe('4th')
    expect(ordinal(0)).toBe('0th')
  })

  it('special-cases the 11th/12th/13th teens regardless of the last digit', () => {
    expect(ordinal(11)).toBe('11th')
    expect(ordinal(12)).toBe('12th')
    expect(ordinal(13)).toBe('13th')
  })

  it('resumes normal 1st/2nd/3rd suffixes just past the teens', () => {
    expect(ordinal(21)).toBe('21st')
    expect(ordinal(22)).toBe('22nd')
    expect(ordinal(23)).toBe('23rd')
    expect(ordinal(111)).toBe('111th') // the x11-x13 rule applies at every hundred, not just 0-99
  })
})
