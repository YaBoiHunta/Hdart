import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import CardGameScreen from './CardGameScreen'
import { createShuffledDeck, cardLabel } from './deck'
import { JOKER_TABLE, applyActiveJokers, summarizeRound } from './jokers'
import type { CardDartMultiplier, CardDartSegment, CardGameDart } from './types'

// Fixed "random" (always 0) makes the deck's draw order reproducible, so
// tests can assert on the exact card/joker revealed instead of just shape.
function fixedRandom() {
  return 0
}

function dart(segment: CardDartSegment, multiplier: CardDartMultiplier = 1): CardGameDart {
  const value = segment === 'OUT' ? 0 : segment * multiplier
  return { segment, multiplier, value }
}

async function setup(user: UserEvent, players: string[] = ['Alice']) {
  const onExit = vi.fn()
  render(<CardGameScreen onExit={onExit} random={fixedRandom} />)
  for (const name of players) {
    await user.type(screen.getByPlaceholderText('Player name'), `${name}{enter}`)
  }
  await user.click(screen.getByRole('button', { name: 'Start Game' }))
  return { onExit }
}

async function throwThreeDarts(user: UserEvent, segments: CardDartSegment[] = [20, 20, 20]) {
  for (const segment of segments) {
    await user.click(screen.getByRole('button', { name: String(segment) }))
  }
}

describe('setup screen', () => {
  it('disables Start Game until a player is added, and supports remove', async () => {
    const user = userEvent.setup()
    render(<CardGameScreen onExit={vi.fn()} />)

    expect(screen.getByText('Joker Draw')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeDisabled()

    await user.type(screen.getByPlaceholderText('Player name'), 'Alice{enter}')
    expect(screen.getByText('Alice')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeEnabled()

    await user.click(screen.getByRole('button', { name: '✕' }))
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeDisabled()
  })

  it('calls onExit from the back button without starting a game', async () => {
    const user = userEvent.setup()
    const onExit = vi.fn()
    render(<CardGameScreen onExit={onExit} />)
    await user.click(screen.getByRole('button', { name: '← Back' }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})

describe('playing screen', () => {
  it('reveals round 1 with the correct card and joker for the shuffle seed', async () => {
    const user = userEvent.setup()
    await setup(user)

    expect(screen.getByText('Round 1 / 5')).toBeInTheDocument()

    const expectedCard = createShuffledDeck(fixedRandom)[0]
    const expectedJoker = JOKER_TABLE[expectedCard.rank]
    expect(screen.getByText(cardLabel(expectedCard))).toBeInTheDocument()
    expect(screen.getByText(expectedJoker.name)).toBeInTheDocument()
    expect(screen.getByText(expectedJoker.description)).toBeInTheDocument()
    expect(screen.getByText(`${cardLabel(expectedCard)} ${expectedJoker.name}`)).toBeInTheDocument()

    expect(screen.getByText("Alice's turn")).toBeInTheDocument()
  })
})

describe('turn flow', () => {
  it('banks the joker-adjusted score on the 3rd dart and advances to the next player', async () => {
    const user = userEvent.setup()
    await setup(user, ['Alice', 'Bob'])

    await throwThreeDarts(user, [20, 20, 20])

    expect(screen.getByText("Bob's turn")).toBeInTheDocument()

    const expectedCard = createShuffledDeck(fixedRandom)[0]
    const expectedJoker = JOKER_TABLE[expectedCard.rank]
    const darts = [dart(20), dart(20), dart(20)]
    const summary = summarizeRound(darts)
    const expectedTotal = applyActiveJokers(summary.rawTotal, summary, [
      { effect: expectedJoker.effect },
    ])

    const aliceRow = screen.getByText('Alice').closest('.card-player-row')
    expect(aliceRow).not.toBeNull()
    expect(within(aliceRow as HTMLElement).getByText(`${expectedTotal} pts`)).toBeInTheDocument()
  })

  it('undo removes only the last dart of the in-progress turn, before anything is banked', async () => {
    const user = userEvent.setup()
    await setup(user)

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '1' }))
    expect(screen.getByText('this turn: 21')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('this turn: 20')).toBeInTheDocument()

    const aliceRow = screen.getByText('Alice').closest('.card-player-row')
    expect(within(aliceRow as HTMLElement).getByText('0 pts')).toBeInTheDocument()
  })

  it('Double/Triple toggles apply to only the next dart, matching the main game pad', async () => {
    const user = userEvent.setup()
    await setup(user)

    await user.click(screen.getByRole('button', { name: 'Triple' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('this turn: 60')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('this turn: 80')).toBeInTheDocument() // 60 + single 20, toggle reset
  })
})

describe('full game', () => {
  it('runs 5 rounds and lands on an exact tie when both players throw identically every turn', async () => {
    const user = userEvent.setup()
    await setup(user, ['Alice', 'Bob'])

    for (let round = 0; round < 5; round++) {
      await throwThreeDarts(user, [20, 20, 20])
      await throwThreeDarts(user, [20, 20, 20])
    }

    expect(screen.getByText("It's a tie: Alice & Bob!")).toBeInTheDocument()
    const standingsItems = screen.getAllByRole('listitem')
    expect(standingsItems).toHaveLength(2)
    for (const item of standingsItems) {
      expect(within(item).getByText('1st')).toBeInTheDocument()
    }
    const aliceStanding = screen.getByText('Alice').closest('li')
    const bobStanding = screen.getByText('Bob').closest('li')
    expect(within(aliceStanding as HTMLElement).getByText(/pts$/).textContent).toBe(
      within(bobStanding as HTMLElement).getByText(/pts$/).textContent,
    )
  })

  it('Rematch keeps the roster but resets totals and round to 1', async () => {
    const user = userEvent.setup()
    await setup(user, ['Alice'])
    for (let round = 0; round < 5; round++) {
      await throwThreeDarts(user, [20, 20, 20])
    }
    expect(screen.getByText('Alice wins!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(screen.getByText('Round 1 / 5')).toBeInTheDocument()
    const aliceRow = screen.getByText('Alice').closest('.card-player-row')
    expect(within(aliceRow as HTMLElement).getByText('0 pts')).toBeInTheDocument()
  })

  it('New Game clears the roster back to setup', async () => {
    const user = userEvent.setup()
    await setup(user, ['Alice'])
    for (let round = 0; round < 5; round++) {
      await throwThreeDarts(user, [20, 20, 20])
    }

    await user.click(screen.getByRole('button', { name: 'New Game' }))
    expect(screen.getByPlaceholderText('Player name')).toBeInTheDocument()
    expect(screen.queryByText('Alice')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeDisabled()
  })

  it('Exit from the game-over screen calls onExit', async () => {
    const user = userEvent.setup()
    const { onExit } = await setup(user, ['Alice'])
    for (let round = 0; round < 5; round++) {
      await throwThreeDarts(user, [20, 20, 20])
    }

    await user.click(screen.getByRole('button', { name: 'Exit' }))
    expect(onExit).toHaveBeenCalledOnce()
  })
})
