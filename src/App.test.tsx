import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup, fireEvent } from '@testing-library/react'
import userEvent, { type UserEvent } from '@testing-library/user-event'
import App from './App'

// App persists to real localStorage; without clearing it, a saved game from
// one test would be restored at the start of the next one.
beforeEach(() => {
  localStorage.clear()
})

async function startGame(
  user: UserEvent,
  { mode = '501', players = ['Hunter'] }: { mode?: string; players?: string[] } = {},
) {
  render(<App />)
  await user.click(screen.getByRole('button', { name: mode }))
  for (const name of players) {
    await user.type(screen.getByPlaceholderText('Player name'), name)
    await user.click(screen.getByRole('button', { name: 'Add' }))
  }
  await user.click(screen.getByRole('button', { name: 'Start Game' }))
}

describe('mode select & player setup', () => {
  it('lets you pick a mode, then add and remove players', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByRole('button', { name: '301' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '501' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '501' }))
    expect(screen.getByText('Mode: 501')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeDisabled()

    const input = screen.getByPlaceholderText('Player name')
    await user.type(input, 'Hunter{enter}')
    await user.type(input, 'Friend{enter}')
    expect(screen.getByText('Hunter')).toBeInTheDocument()
    expect(screen.getByText('Friend')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Start Game' })).toBeEnabled()

    await user.click(screen.getAllByRole('button', { name: '✕' })[0])
    expect(screen.queryByText('Hunter')).not.toBeInTheDocument()
  })

  it('lets you go back to mode select if you picked the wrong mode, keeping your players', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: '501' }))
    await user.type(screen.getByPlaceholderText('Player name'), 'Hunter{enter}')

    await user.click(screen.getByRole('button', { name: '← Back' }))
    expect(screen.getByText('Choose a game mode')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Around the World' }))
    expect(screen.getByText('Mode: around-the-world')).toBeInTheDocument()
    expect(screen.getByText('Hunter')).toBeInTheDocument()
  })
})

describe('scoring buttons', () => {
  it('applies double/triple multipliers and resets after each throw', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: 'Triple' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('441')).toBeInTheDocument() // 501 - 60
    expect(screen.getByText('T20')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Double' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('401')).toBeInTheDocument() // 441 - 40
    expect(screen.getByText('D20')).toBeInTheDocument()
  })

  it('deselects a multiplier when pressed twice', async () => {
    const user = userEvent.setup()
    await startGame(user)

    const doubleBtn = screen.getByRole('button', { name: 'Double' })
    await user.click(doubleBtn)
    expect(doubleBtn.className).toContain('active')
    await user.click(doubleBtn)
    expect(doubleBtn.className).not.toContain('active')

    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('481')).toBeInTheDocument() // single 20, not double
  })

  it('OUT scores 0 and does not change the score', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: 'OUT' }))
    expect(screen.getByText('501')).toBeInTheDocument()
    // "OUT" now appears twice: the button itself, and the dart slot for this turn.
    expect(screen.getAllByText('OUT')).toHaveLength(2)
  })

  it('Undo removes only the last dart of the current turn', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '19' }))
    expect(screen.getByText('462')).toBeInTheDocument() // 501 - 20 - 19

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText('481')).toBeInTheDocument() // only the 20 remains
  })

  it('Undo is disabled until a dart has been thrown this turn', async () => {
    const user = userEvent.setup()
    await startGame(user)

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByRole('button', { name: 'Undo' })).toBeEnabled()
  })

  it('Bullseye (50) scores a flat 50, ignoring an active multiplier', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: 'Triple' }))
    await user.click(screen.getByRole('button', { name: '50' }))
    expect(screen.getByText('451')).toBeInTheDocument() // 501 - 50, triple ignored
  })

  it('Bullseye (50) is not shown in Around the World', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: 'Around the World' })

    expect(screen.queryByRole('button', { name: '50' })).not.toBeInTheDocument()
  })
})

describe('turns and busts', () => {
  it('switches the turn banner to the next player after 3 darts', async () => {
    const user = userEvent.setup()
    await startGame(user, { players: ['Hunter', 'Friend'] })

    expect(screen.getByText("Hunter's turn")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: '5' }))
    await user.click(screen.getByRole('button', { name: '5' }))
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
  })

  it('reverts the score to the start of the turn on a bust', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: '301' })

    const triple20 = async () => {
      await user.click(screen.getByRole('button', { name: 'Triple' }))
      await user.click(screen.getByRole('button', { name: '20' }))
    }
    // Turn 1: T20, T20, T20 -> 301 - 180 = 121
    await triple20()
    await triple20()
    await triple20()
    expect(screen.getByText('121')).toBeInTheDocument()

    // Turn 2: T20 (61), T20 (1), T20 -> overshoots and busts, reverts to 121
    await triple20()
    await triple20()
    await triple20()
    expect(screen.getByText('121')).toBeInTheDocument()
  })
})

describe('cross-turn undo', () => {
  it('reaches back into the previous player turn after confirmation', async () => {
    const user = userEvent.setup()
    await startGame(user, { players: ['Hunter', 'Friend'] })

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '20' })) // Hunter's turn ends, Friend is active
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
    expect(screen.getByText('441')).toBeInTheDocument() // Hunter: 501 - 60

    await user.click(screen.getByRole('button', { name: 'Undo' }))
    expect(screen.getByText("Undo Hunter's last turn?")).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Yes, undo' }))
    expect(screen.getByText("Hunter's turn")).toBeInTheDocument()
    expect(screen.getAllByText('501')).toHaveLength(2) // both players restored to their starting score
  })

  it('cancelling the confirmation leaves the game untouched', async () => {
    const user = userEvent.setup()
    await startGame(user, { players: ['Hunter', 'Friend'] })

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: 'Undo' }))
    await user.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(screen.queryByText("Undo Hunter's last turn?")).not.toBeInTheDocument()
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
    expect(screen.getByText('441')).toBeInTheDocument()
  })

  it('is disabled at the very start of the game, with no previous turn to reach into', async () => {
    const user = userEvent.setup()
    await startGame(user, { players: ['Hunter', 'Friend'] })

    expect(screen.getByRole('button', { name: 'Undo' })).toBeDisabled()
  })
})

describe('quitting a game', () => {
  it('requires confirmation, cancel keeps the game going', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: 'Quit Game' }))
    expect(screen.getByText('Quit this game?')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(screen.queryByText('Quit this game?')).not.toBeInTheDocument()
    expect(screen.getByText('481')).toBeInTheDocument() // the dart thrown earlier still counts
  })

  it('confirming returns to mode select without touching completed-game history', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: 'Quit Game' }))
    await user.click(screen.getByRole('button', { name: 'Yes, quit' }))

    expect(screen.getByText('Choose a game mode')).toBeInTheDocument()
    expect(localStorage.getItem('hdart:history')).toBeNull()
  })
})

describe('winning', () => {
  it('declares a winner at exactly 0 and rematch resets scores', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: '301' })

    const triple20 = async () => {
      await user.click(screen.getByRole('button', { name: 'Triple' }))
      await user.click(screen.getByRole('button', { name: '20' }))
    }
    // Turn 1: T20, T20, T20 -> 301 - 180 = 121
    await triple20()
    await triple20()
    await triple20()
    // Turn 2: T20, T20, 1 -> 121 - 60 - 60 - 1 = 0
    await triple20()
    await triple20()
    await user.click(screen.getByRole('button', { name: '1' }))

    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Rematch' }))
    expect(screen.getByText('301')).toBeInTheDocument()
  })
})

describe('multi-player continue-to-place', () => {
  it('continues playing after the first win to determine 2nd and 3rd place', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: '301', players: ['Hunter', 'Friend', 'Buddy'] })

    const triple20 = async () => {
      await user.click(screen.getByRole('button', { name: 'Triple' }))
      await user.click(screen.getByRole('button', { name: '20' }))
    }
    const turnOf301 = async () => {
      // 301 - 180 = 121, leaves the active player at 121 after 3 darts.
      await triple20()
      await triple20()
      await triple20()
    }
    const finishFrom121 = async () => {
      // 121 - 60 - 60 - 1 = 0
      await triple20()
      await triple20()
      await user.click(screen.getByRole('button', { name: '1' }))
    }

    await turnOf301() // Hunter's turn 1 -> 121
    await turnOf301() // Friend's turn 1 -> 121
    await turnOf301() // Buddy's turn 1 -> 121

    // Hunter finishes (1st) -> the game must continue for 2nd/3rd, not end outright.
    await finishFrom121()
    expect(screen.queryByText('Hunter wins!')).not.toBeInTheDocument()
    expect(screen.getByText(/Hunter finished — 1st place/)).toBeInTheDocument()
    expect(screen.getByText("Friend's turn")).toBeInTheDocument()
    expect(localStorage.getItem('hdart:history')).toBeNull() // not recorded yet

    // Friend finishes (2nd) -> only Buddy is left, so the game ends automatically
    // without Buddy ever needing to throw, and the game is now fully recorded.
    await finishFrom121()
    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()
    expect(screen.getByText('1st').closest('li')?.textContent).toContain('Hunter')
    expect(screen.getByText('2nd').closest('li')?.textContent).toContain('Friend')
    expect(screen.getByText('3rd').closest('li')?.textContent).toContain('Buddy')

    const stored: unknown[] = JSON.parse(localStorage.getItem('hdart:history') ?? '[]')
    expect(stored).toHaveLength(1)
  })
})

describe('game history', () => {
  it('records a completed game and shows it on the History screen', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: '301' })

    const triple20 = async () => {
      await user.click(screen.getByRole('button', { name: 'Triple' }))
      await user.click(screen.getByRole('button', { name: '20' }))
    }
    // 5x T20 (300) + a single 1 -> 301 - 301 = 0
    await triple20()
    await triple20()
    await triple20()
    await triple20()
    await triple20()
    await user.click(screen.getByRole('button', { name: '1' }))

    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'New Game' }))
    await user.click(screen.getByRole('button', { name: 'History' }))

    expect(screen.getByText('301')).toBeInTheDocument()
    expect(screen.getByText('Hunter (won)')).toBeInTheDocument()

    const roundsToggle = screen.getByRole('button', { name: /Rounds \(2\)/ })
    expect(screen.queryByText('T20')).not.toBeInTheDocument()

    await user.click(roundsToggle)
    expect(screen.getAllByText('T20')).toHaveLength(5) // 5 triple-20s across both rounds
    expect(screen.getByText('Hide rounds ▲')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Hide rounds ▲' }))
    expect(screen.queryByText('T20')).not.toBeInTheDocument()
  })

  it('does not duplicate the entry if the page refreshes right after a win', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: '301' })

    const triple20 = async () => {
      await user.click(screen.getByRole('button', { name: 'Triple' }))
      await user.click(screen.getByRole('button', { name: '20' }))
    }
    // 5x T20 (300) + a single 1 -> 301 - 301 = 0
    await triple20()
    await triple20()
    await triple20()
    await triple20()
    await triple20()
    await user.click(screen.getByRole('button', { name: '1' }))

    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()

    cleanup() // simulate refreshing the page while still on the win screen
    render(<App />)

    const stored: unknown[] = JSON.parse(localStorage.getItem('hdart:history') ?? '[]')
    expect(stored).toHaveLength(1)
  })

  it('exports history as a downloadable JSON file', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        { finishedAt: 'game-1', modeId: '301', modeLabel: '301', players: [{ name: 'Hunter', won: true, average: 50, turns: 3 }], highestRound: null },
      ]),
    )

    const createObjectURL = vi.fn(() => 'blob:mock-url')
    const revokeObjectURL = vi.fn()
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL })
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(screen.getByRole('button', { name: 'Export JSON' }))

    expect(createObjectURL).toHaveBeenCalled()
    expect(clickSpy).toHaveBeenCalled()
    expect(revokeObjectURL).toHaveBeenCalledWith('blob:mock-url')

    clickSpy.mockRestore()
    vi.unstubAllGlobals()
  })

  it('imports a history JSON file and merges new games without duplicating existing ones', async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      'hdart:history',
      JSON.stringify([
        { finishedAt: 'existing-game', modeId: '301', modeLabel: '301', players: [{ name: 'Hunter', won: true, average: 50, turns: 3 }], highestRound: null },
      ]),
    )

    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))

    const file = new File(
      [
        JSON.stringify([
          { finishedAt: 'existing-game', modeId: '301', modeLabel: '301', players: [{ name: 'Hunter', won: true, average: 50, turns: 3 }], highestRound: null },
          { finishedAt: 'imported-game', modeId: '501', modeLabel: '501', players: [{ name: 'Friend', won: true, average: 60, turns: 4 }], highestRound: null },
        ]),
      ],
      'history.json',
      { type: 'application/json' },
    )

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    expect(await screen.findByText('Imported 1 game (1 already had a copy)')).toBeInTheDocument()

    const stored: { finishedAt: string }[] = JSON.parse(localStorage.getItem('hdart:history') ?? '[]')
    expect(stored.map((e) => e.finishedAt).sort()).toEqual(['existing-game', 'imported-game'])
  })

  it('Back from the History screen returns to mode select', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(screen.getByText('No games finished yet.')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Back' }))
    expect(screen.getByText('Choose a game mode')).toBeInTheDocument()
  })

  it('clicking Import JSON opens the file picker', async () => {
    const user = userEvent.setup()
    const clickSpy = vi.spyOn(HTMLInputElement.prototype, 'click').mockImplementation(() => {})
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(screen.getByRole('button', { name: 'Import JSON' }))
    expect(clickSpy).toHaveBeenCalled()
    clickSpy.mockRestore()
  })

  it('shows an error message when the selected file is not valid JSON', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))

    const file = new File(['not valid json{{{'], 'history.json', { type: 'application/json' })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    expect(
      await screen.findByText('Could not read that file — is it a Downtime Darts history export?'),
    ).toBeInTheDocument()
  })

  it('shows a "no valid games" message when the file parses but contains nothing usable', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'History' }))

    const file = new File([JSON.stringify([{ not: 'a valid entry' }])], 'history.json', {
      type: 'application/json',
    })
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    expect(await screen.findByText('No valid games found in that file.')).toBeInTheDocument()
  })
})

describe('card game entry point', () => {
  it('opens Joker Draw from mode select and exits back to it', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Joker Draw (Beta)' }))
    expect(screen.getByText('Joker Draw')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '← Back' }))
    expect(screen.getByText('Choose a game mode')).toBeInTheDocument()
  })
})

describe('sound toggle', () => {
  it('mutes and unmutes, persisting the preference', async () => {
    const user = userEvent.setup()
    render(<App />)

    const toggle = screen.getByRole('button', { name: 'Mute sound' })
    expect(toggle).toHaveTextContent('🔊')

    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Unmute sound' })).toHaveTextContent('🔇')

    await user.click(screen.getByRole('button', { name: 'Unmute sound' }))
    expect(screen.getByRole('button', { name: 'Mute sound' })).toHaveTextContent('🔊')
  })
})

describe('turn history', () => {
  it('always shows the last completed turn without needing to expand anything', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: '20' }))
    await user.click(screen.getByRole('button', { name: '19' }))
    await user.click(screen.getByRole('button', { name: '18' }))

    expect(screen.getByText('Last turn')).toBeInTheDocument()
    expect(screen.getByText('57')).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /full history/i }),
    ).not.toBeInTheDocument()
  })

  it('shows a "Full history" toggle only after 2+ completed turns, and it expands/collapses', async () => {
    const user = userEvent.setup()
    await startGame(user)

    const throwThree = async (n: number) => {
      await user.click(screen.getByRole('button', { name: String(n) }))
      await user.click(screen.getByRole('button', { name: String(n) }))
      await user.click(screen.getByRole('button', { name: String(n) }))
    }
    await throwThree(5) // turn 1: total 15
    expect(
      screen.queryByRole('button', { name: /full history/i }),
    ).not.toBeInTheDocument()

    await throwThree(6) // turn 2: total 18
    const historyToggle = screen.getByRole('button', { name: /full history \(2\)/i })
    expect(historyToggle).toBeInTheDocument()

    await user.click(historyToggle)
    expect(screen.getByText('Turn 1')).toBeInTheDocument()
    expect(screen.getByText('Turn 2')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /hide full history/i }))
    expect(screen.queryByText('Turn 1')).not.toBeInTheDocument()
  })
})

describe('persistence', () => {
  it('restores an in-progress game after remounting (simulated reload)', async () => {
    const user = userEvent.setup()
    await startGame(user)

    await user.click(screen.getByRole('button', { name: 'Triple' }))
    await user.click(screen.getByRole('button', { name: '20' }))
    expect(screen.getByText('441')).toBeInTheDocument()

    cleanup() // simulate closing the tab/refreshing
    render(<App />) // simulate reopening it

    expect(screen.getByText("Hunter's turn")).toBeInTheDocument()
    expect(screen.getByText('441')).toBeInTheDocument()
    expect(screen.getByText('T20')).toBeInTheDocument() // in-progress dart survived too
  })

  it('starts fresh at mode select when localStorage holds corrupted data', () => {
    localStorage.setItem('hdart:game-state', 'not valid json{{{')
    render(<App />)
    expect(screen.getByRole('button', { name: '301' })).toBeInTheDocument()
  })

  it('backfills finishOrder from winnerId for a game persisted before finishOrder existed', () => {
    localStorage.setItem(
      'hdart:game-state',
      JSON.stringify({
        phase: 'game',
        modeId: '301',
        players: [{ id: 1, name: 'Hunter', score: 0, turnHistory: [{ throws: [], total: 301, bust: false }] }],
        currentPlayerIndex: 0,
        currentTurn: { throws: [], startScore: 0, startTargetIndex: 0 },
        activeMultiplier: 1,
        winnerId: 1,
        // no finishOrder, no turnOrderLog — this is what a save from before
        // those fields existed looks like.
      }),
    )
    render(<App />)
    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()
  })

  it('defaults finishOrder to empty when neither finishOrder nor winnerId is present', () => {
    localStorage.setItem(
      'hdart:game-state',
      JSON.stringify({
        phase: 'game',
        modeId: '301',
        players: [{ id: 1, name: 'Hunter', score: 441, turnHistory: [] }],
        currentPlayerIndex: 0,
        currentTurn: { throws: [], startScore: 441, startTargetIndex: 0 },
        activeMultiplier: 1,
        winnerId: null,
      }),
    )
    render(<App />)
    expect(screen.getByText("Hunter's turn")).toBeInTheDocument()
  })
})

describe('around the world', () => {
  it('hides the multiplier row and does not advance the target on a miss', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: 'Around the World' })

    expect(screen.queryByRole('button', { name: 'Double' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Triple' })).not.toBeInTheDocument()

    const targetDisplay = screen.getByText('Target').parentElement
    expect(targetDisplay).not.toBeNull()
    expect(targetDisplay?.textContent).toBe('Target1')

    await user.click(screen.getByRole('button', { name: '7' })) // miss, target is 1
    expect(targetDisplay?.textContent).toBe('Target1')
  })

  it('wins after completing the full sequence, ending on Bull (25)', async () => {
    const user = userEvent.setup()
    await startGame(user, { mode: 'Around the World' })

    for (let n = 1; n <= 20; n++) {
      await user.click(screen.getByRole('button', { name: String(n) }))
    }
    await user.click(screen.getByRole('button', { name: '25' }))

    expect(screen.getByText('Hunter wins!')).toBeInTheDocument()
  })
})

describe('number pad flash animation', () => {
  it('clears its own flash class when the flash animation ends', async () => {
    const user = userEvent.setup()
    await startGame(user)

    const button = screen.getByRole('button', { name: '20' })
    await user.click(button)
    expect(button.className).toContain('flash')

    fireEvent.animationEnd(button)
    expect(button.className).not.toContain('flash')
  })
})
