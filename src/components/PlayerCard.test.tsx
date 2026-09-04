import { describe, it, expect } from 'vitest'
import userEvent from '@testing-library/user-event'
import { render, screen, fireEvent } from '@testing-library/react'
import PlayerCard from './PlayerCard'
import type { CountdownMode, Player } from '../game/types'

const mode: CountdownMode = { id: '501', label: '501', family: 'countdown', startingScore: 501 }

function countdownPlayer(overrides: Partial<Player> = {}): Player {
  return { id: 1, name: 'Hunter', score: 501, turnHistory: [], ...overrides }
}

describe('PlayerCard', () => {
  it('renders nothing in the score slot for a player that is neither countdown nor progression', () => {
    // Not reachable through normal play (Player is a countdown/progression union),
    // but renderStatus has a defensive fallback for it — exercise that directly.
    const oddPlayer = { id: 1, name: 'Hunter', turnHistory: [] } as unknown as Player
    render(<PlayerCard player={oddPlayer} mode={mode} isActive={false} turnThrows={[]} />)
    expect(screen.getByText('Hunter')).toBeInTheDocument()
    expect(document.querySelector('.player-score')).not.toBeInTheDocument()
  })

  it('clears the bust shake only on an animationend targeting the card itself, not a bubbled child one', () => {
    const player = countdownPlayer({
      turnHistory: [{ throws: [], total: 0, bust: true }],
    })
    const { rerender } = render(
      <PlayerCard player={countdownPlayer()} mode={mode} isActive={false} turnThrows={[]} />,
    )
    // Grow turnHistory by one bust entry to trigger the busted-shake effect.
    rerender(<PlayerCard player={player} mode={mode} isActive={false} turnThrows={[]} />)

    const card = document.querySelector('.player-card') as HTMLElement
    expect(card.className).toContain('busted')

    // A bubbled animationend from a child (e.g. the score span) must not clear it.
    const scoreSpan = document.querySelector('.player-score') as HTMLElement
    fireEvent.animationEnd(scoreSpan)
    expect(card.className).toContain('busted')

    // An animationend on the card itself clears it.
    fireEvent.animationEnd(card)
    expect(card.className).not.toContain('busted')
  })

  it('removes the pulse class from the score span when its own animation ends', () => {
    render(<PlayerCard player={countdownPlayer()} mode={mode} isActive={false} turnThrows={[]} />)
    const scoreSpan = document.querySelector('.player-score') as HTMLElement
    scoreSpan.classList.add('pulse')
    fireEvent.animationEnd(scoreSpan)
    expect(scoreSpan.className).not.toContain('pulse')
  })

  it('clears a popping dart slot when its own animation ends', () => {
    const { rerender } = render(
      <PlayerCard player={countdownPlayer()} mode={mode} isActive turnThrows={[]} />,
    )
    rerender(
      <PlayerCard
        player={countdownPlayer()}
        mode={mode}
        isActive
        turnThrows={[{ segment: 20, multiplier: 1, value: 20 }]}
      />,
    )
    const slots = document.querySelectorAll('.dart-slot')
    expect(slots[0].className).toContain('pop-in')

    fireEvent.animationEnd(slots[0])
    expect(slots[0].className).not.toContain('pop-in')
  })

  it('leaves the popping slot alone on a stale animationend from a slot that is no longer popping', () => {
    const { rerender } = render(
      <PlayerCard player={countdownPlayer()} mode={mode} isActive turnThrows={[]} />,
    )
    rerender(
      <PlayerCard
        player={countdownPlayer()}
        mode={mode}
        isActive
        turnThrows={[
          { segment: 20, multiplier: 1, value: 20 },
          { segment: 19, multiplier: 1, value: 19 },
        ]}
      />,
    )
    const slots = document.querySelectorAll('.dart-slot')
    // Slot 1 (the 2nd dart) is the current popping slot; slot 0's pop-in
    // animation already finished earlier and is no longer tracked.
    expect(slots[1].className).toContain('pop-in')

    fireEvent.animationEnd(slots[0])
    expect(slots[1].className).toContain('pop-in') // unaffected by the stale event
  })

  it('shows each completed turn in the expanded full history, including a non-bust total', async () => {
    const user = userEvent.setup()
    const player = countdownPlayer({
      turnHistory: [
        { throws: [{ segment: 20, multiplier: 1, value: 20 }], total: 20, bust: false },
        { throws: [{ segment: 5, multiplier: 3, value: 15 }], total: 0, bust: true },
      ],
    })
    render(<PlayerCard player={player} mode={mode} isActive={false} turnThrows={[]} />)

    await user.click(screen.getByRole('button', { name: /Full history \(2\)/ }))
    const entries = document.querySelectorAll('.turn-history > li')
    expect(entries[0].className).toBe('')
    expect(entries[0].querySelector('.turn-history-total')?.textContent).toBe('20')
    expect(entries[1].className).toBe('bust')
    expect(entries[1].querySelector('.turn-history-total')?.textContent).toBe('BUST')
  })
})
