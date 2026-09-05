import { describe, it, expect } from 'vitest'
import { summarizeRound, applyJokerEffect, applyActiveJokers, JOKER_TABLE } from './jokers'
import type { CardGameDart, CardDartMultiplier, CardDartSegment } from './types'

function dart(segment: CardDartSegment, multiplier: CardDartMultiplier = 1): CardGameDart {
  const value = segment === 'OUT' ? 0 : segment * multiplier
  return { segment, multiplier, value }
}

describe('summarizeRound', () => {
  it('classifies singles, doubles, triples, bulls, and misses', () => {
    const summary = summarizeRound([dart(20, 1), dart(20, 2), dart(20, 3)])
    expect(summary.singleCount).toBe(1)
    expect(summary.doubleCount).toBe(1)
    expect(summary.tripleCount).toBe(1)
    expect(summary.rawTotal).toBe(20 + 40 + 60)
  })

  it('treats 25 and 50 as bull regardless of multiplier, not double/triple', () => {
    const summary = summarizeRound([dart(25, 1), dart(25, 2), dart(50, 1)])
    expect(summary.bullCount).toBe(3)
    expect(summary.doubleCount).toBe(0)
    expect(summary.tripleCount).toBe(0)
  })

  it('hasExactBullseye is only true for a literal 50 segment', () => {
    expect(summarizeRound([dart(25, 2)]).hasExactBullseye).toBe(false)
    expect(summarizeRound([dart(50, 1)]).hasExactBullseye).toBe(true)
  })

  it('counts OUT darts as misses with zero value', () => {
    const summary = summarizeRound([dart('OUT'), dart('OUT'), dart('OUT')])
    expect(summary.missCount).toBe(3)
    expect(summary.rawTotal).toBe(0)
  })
})

describe('joker effects', () => {
  it('2 Warm-Up: +amount per single', () => {
    const darts = [dart(20, 1), dart(1, 1), dart('OUT')]
    const summary = summarizeRound(darts)
    const score = applyJokerEffect(summary.rawTotal, summary, JOKER_TABLE['2'].effect)
    expect(score).toBe(21 + 2) // rawTotal 21, +1 per single x2 singles
  })

  it('3 Steady Hand: +3 only with zero misses', () => {
    const clean = summarizeRound([dart(20), dart(20), dart(20)])
    const withMiss = summarizeRound([dart(20), dart(20), dart('OUT')])
    expect(applyJokerEffect(clean.rawTotal, clean, JOKER_TABLE['3'].effect)).toBe(63)
    expect(applyJokerEffect(withMiss.rawTotal, withMiss, JOKER_TABLE['3'].effect)).toBe(40)
  })

  it('4 Double Down: +4 per double', () => {
    const summary = summarizeRound([dart(20, 2), dart(20, 2), dart(1, 1)])
    expect(applyJokerEffect(summary.rawTotal, summary, JOKER_TABLE['4'].effect)).toBe(
      summary.rawTotal + 8,
    )
  })

  it('5 High Five: +5 per bull hit', () => {
    const summary = summarizeRound([dart(25, 1), dart(50, 1), dart(1, 1)])
    expect(applyJokerEffect(summary.rawTotal, summary, JOKER_TABLE['5'].effect)).toBe(
      summary.rawTotal + 10,
    )
  })

  it('6 Hot Streak: +6 per triple', () => {
    const summary = summarizeRound([dart(20, 3), dart(1, 1), dart(1, 1)])
    expect(applyJokerEffect(summary.rawTotal, summary, JOKER_TABLE['6'].effect)).toBe(
      summary.rawTotal + 6,
    )
  })

  it('7 Lucky Seven: +7 only when the exact 50 bullseye is hit', () => {
    const withFifty = summarizeRound([dart(50, 1), dart(1), dart(1)])
    const withDoubledBull = summarizeRound([dart(25, 2), dart(1), dart(1)])
    expect(applyJokerEffect(withFifty.rawTotal, withFifty, JOKER_TABLE['7'].effect)).toBe(
      withFifty.rawTotal + 7,
    )
    expect(
      applyJokerEffect(withDoubledBull.rawTotal, withDoubledBull, JOKER_TABLE['7'].effect),
    ).toBe(withDoubledBull.rawTotal)
  })

  it('8 Full House: +8 only with both a double and a triple', () => {
    const both = summarizeRound([dart(20, 2), dart(20, 3), dart(1)])
    const onlyDouble = summarizeRound([dart(20, 2), dart(1), dart(1)])
    expect(applyJokerEffect(both.rawTotal, both, JOKER_TABLE['8'].effect)).toBe(both.rawTotal + 8)
    expect(applyJokerEffect(onlyDouble.rawTotal, onlyDouble, JOKER_TABLE['8'].effect)).toBe(
      onlyDouble.rawTotal,
    )
  })

  it("9 Underdog: +20 only on an all-miss round", () => {
    const allMiss = summarizeRound([dart('OUT'), dart('OUT'), dart('OUT')])
    const twoMiss = summarizeRound([dart('OUT'), dart('OUT'), dart(1)])
    expect(applyJokerEffect(allMiss.rawTotal, allMiss, JOKER_TABLE['9'].effect)).toBe(20)
    expect(applyJokerEffect(twoMiss.rawTotal, twoMiss, JOKER_TABLE['9'].effect)).toBe(1)
  })

  it('10 Perfect Ten: x1.5 only with zero misses', () => {
    const clean = summarizeRound([dart(20), dart(20), dart(20)])
    const withMiss = summarizeRound([dart(20), dart(20), dart('OUT')])
    expect(applyJokerEffect(clean.rawTotal, clean, JOKER_TABLE['10'].effect)).toBe(90)
    expect(applyJokerEffect(withMiss.rawTotal, withMiss, JOKER_TABLE['10'].effect)).toBe(40)
  })

  it('J Jack of Triples: +10 per triple', () => {
    const summary = summarizeRound([dart(20, 3), dart(20, 3), dart(1)])
    expect(applyJokerEffect(summary.rawTotal, summary, JOKER_TABLE.J.effect)).toBe(
      summary.rawTotal + 20,
    )
  })

  it("Q Queen's Gambit: x2 only when raw total is >= 100", () => {
    const big = summarizeRound([dart(20, 3), dart(20, 3), dart(20, 3)]) // 180
    const small = summarizeRound([dart(20, 1), dart(1, 1), dart(1, 1)])
    expect(applyJokerEffect(big.rawTotal, big, JOKER_TABLE.Q.effect)).toBe(360)
    expect(applyJokerEffect(small.rawTotal, small, JOKER_TABLE.Q.effect)).toBe(small.rawTotal)
  })

  it("K King's Decree: x2 only with 2+ triples", () => {
    const twoTriples = summarizeRound([dart(20, 3), dart(20, 3), dart(1)])
    const oneTriple = summarizeRound([dart(20, 3), dart(1), dart(1)])
    expect(applyJokerEffect(twoTriples.rawTotal, twoTriples, JOKER_TABLE.K.effect)).toBe(
      twoTriples.rawTotal * 2,
    )
    expect(applyJokerEffect(oneTriple.rawTotal, oneTriple, JOKER_TABLE.K.effect)).toBe(
      oneTriple.rawTotal,
    )
  })

  it('A Ace High: x3 only when every dart is a double or triple', () => {
    const allMultiplied = summarizeRound([dart(20, 2), dart(20, 3), dart(1, 2)])
    const withSingle = summarizeRound([dart(20, 2), dart(20, 3), dart(1, 1)])
    expect(applyJokerEffect(allMultiplied.rawTotal, allMultiplied, JOKER_TABLE.A.effect)).toBe(
      allMultiplied.rawTotal * 3,
    )
    expect(applyJokerEffect(withSingle.rawTotal, withSingle, JOKER_TABLE.A.effect)).toBe(
      withSingle.rawTotal,
    )
  })
})

describe('applyActiveJokers', () => {
  it('applies every active joker in draw order, sequentially', () => {
    const summary = summarizeRound([dart(20), dart(20), dart(20)]) // rawTotal 60, no misses
    const addThenMultiply = applyActiveJokers(summary.rawTotal, summary, [
      { effect: JOKER_TABLE['3'].effect }, // +3
      { effect: JOKER_TABLE['10'].effect }, // x1.5
    ])
    const multiplyThenAdd = applyActiveJokers(summary.rawTotal, summary, [
      { effect: JOKER_TABLE['10'].effect }, // x1.5
      { effect: JOKER_TABLE['3'].effect }, // +3
    ])
    expect(addThenMultiply).toBe((60 + 3) * 1.5)
    expect(multiplyThenAdd).toBe(60 * 1.5 + 3)
    expect(addThenMultiply).not.toBe(multiplyThenAdd)
  })

  it('returns the raw total unchanged with no active jokers', () => {
    const summary = summarizeRound([dart(20), dart(20), dart(20)])
    expect(applyActiveJokers(summary.rawTotal, summary, [])).toBe(60)
  })
})
