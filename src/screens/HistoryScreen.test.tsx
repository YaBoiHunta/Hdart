import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import HistoryScreen from './HistoryScreen'
import { appendGameResult } from '../game/history'
import type { GameHistoryEntry } from '../game/types'

beforeEach(() => {
  localStorage.clear()
})

function makeEntry(overrides: Partial<GameHistoryEntry> = {}): GameHistoryEntry {
  return {
    finishedAt: '2024-01-01T00:00:00.000Z',
    modeId: '501',
    modeLabel: '501',
    players: [
      { name: 'Hunter', won: true, average: 50, turns: 3, turnHistory: [] },
      { name: 'Friend', won: false, average: null, turns: 0, turnHistory: [] },
    ],
    highestRound: null,
    ...overrides,
  }
}

describe('HistoryScreen', () => {
  it('shows a dash average and no (won) suffix for a losing player, and highlights the winner', () => {
    appendGameResult(makeEntry())
    render(<HistoryScreen onBack={vi.fn()} />)

    expect(screen.getByText('Hunter (won)')).toBeInTheDocument()
    const friendRow = screen.getByText('Friend').closest('li')
    expect(friendRow?.textContent).not.toContain('(won)')
    expect(friendRow?.className).not.toContain('won')
    expect(within(friendRow as HTMLElement).getByText('—')).toBeInTheDocument()
  })

  it('shows BUST and applies the bust class for a busted round in the expanded detail', async () => {
    const user = userEvent.setup()
    appendGameResult(
      makeEntry({
        players: [
          {
            name: 'Hunter',
            won: true,
            average: 30,
            turns: 2,
            turnHistory: [
              { throws: [{ segment: 20, multiplier: 1, value: 20 }], total: 20, bust: false },
              { throws: [{ segment: 20, multiplier: 3, value: 60 }], total: 0, bust: true },
            ],
          },
          { name: 'Friend', won: false, average: null, turns: 0, turnHistory: [] },
        ],
      }),
    )
    render(<HistoryScreen onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Detailed ▼' }))
    expect(screen.getByText('BUST')).toBeInTheDocument()
    expect(screen.getByText('BUST').closest('li')?.className).toContain('bust')
    expect(screen.getByText('Turn 1').closest('li')?.className).not.toContain('bust')

    // New per-player stats shown in the expanded panel (countdown-family game).
    expect(screen.getByText('First-9 avg: 10.0')).toBeInTheDocument()
    expect(screen.getByText('Worst turn: 0 (bust)')).toBeInTheDocument()
    expect(screen.getByText('Bust rate: 50%')).toBeInTheDocument()
    expect(screen.getByText('Won in 2 turns / 2 darts')).toBeInTheDocument()
  })

  it('singularizes "turn" and "dart" when the winner needed exactly one of each', async () => {
    const user = userEvent.setup()
    appendGameResult(
      makeEntry({
        players: [
          {
            name: 'Hunter',
            won: true,
            average: 50,
            turns: 1,
            turnHistory: [{ throws: [{ segment: 25, multiplier: 2, value: 50 }], total: 50, bust: false }],
          },
          { name: 'Friend', won: false, average: null, turns: 0, turnHistory: [] },
        ],
      }),
    )
    render(<HistoryScreen onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Detailed ▼' }))
    expect(screen.getByText('Won in 1 turn / 1 dart')).toBeInTheDocument()
  })

  it('does not show a "Won in" line for a non-winning player', async () => {
    const user = userEvent.setup()
    appendGameResult(
      makeEntry({
        players: [
          { name: 'Hunter', won: true, average: 50, turns: 3, turnHistory: [] },
          {
            name: 'Friend',
            won: false,
            average: 20,
            turns: 1,
            turnHistory: [{ throws: [{ segment: 20, multiplier: 1, value: 20 }], total: 20, bust: false }],
          },
        ],
      }),
    )
    render(<HistoryScreen onBack={vi.fn()} />)

    const friendRow = screen.getByText('Friend').closest('li') as HTMLElement
    await user.click(within(friendRow).getByRole('button', { name: 'Detailed ▼' }))
    expect(within(friendRow).queryByText(/Won in/)).not.toBeInTheDocument()
  })

  it('hides bust rate for a progression-family (Around the World) game', async () => {
    const user = userEvent.setup()
    appendGameResult(
      makeEntry({
        modeId: 'around-the-world',
        modeLabel: 'Around the World',
        players: [
          {
            name: 'Hunter',
            won: true,
            average: 2,
            turns: 1,
            turnHistory: [{ throws: [{ segment: 1, multiplier: 1, value: 1 }], total: 1, bust: false }],
          },
        ],
      }),
    )
    render(<HistoryScreen onBack={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Detailed ▼' }))
    expect(screen.getByText('First-9 avg: 1.0')).toBeInTheDocument()
    expect(screen.queryByText(/Bust rate/)).not.toBeInTheDocument()
    expect(screen.getByText('Won in 1 turn / 1 dart')).toBeInTheDocument()
  })

  it('falls back to modeId as the label, and to an empty rounds list, when data predates those fields', () => {
    // Not reachable through real loadHistory() (it always normalizes
    // modeLabel/turnHistory before returning) — mocked here to exercise
    // HistoryScreen's own defensive fallback directly.
    vi.resetModules()
    vi.doMock('../game/history', () => ({
      loadHistory: () => [
        {
          finishedAt: '2024-01-01T00:00:00.000Z',
          modeId: 'legacy-mode',
          modeLabel: undefined,
          players: [{ name: 'Hunter', won: true, average: 50, turns: 1, turnHistory: undefined }],
          highestRound: null,
        },
      ],
      exportHistoryJson: () => '[]',
      importHistory: () => ({ added: 0, skipped: 0 }),
    }))
    return import('./HistoryScreen').then(({ default: MockedHistoryScreen }) => {
      render(<MockedHistoryScreen onBack={vi.fn()} />)
      expect(screen.getByText('legacy-mode')).toBeInTheDocument()
      // No detail toggle: an empty (fallback) turnHistory means rounds.length is 0.
      expect(screen.queryByRole('button', { name: /Detailed/ })).not.toBeInTheDocument()
      vi.doUnmock('../game/history')
    })
  })

  it('ignores a file-input change with no file selected', () => {
    appendGameResult(makeEntry())
    render(<HistoryScreen onBack={vi.fn()} />)
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    fireEvent.change(fileInput, { target: { files: [] } })
    // No crash, no import message shown.
    expect(screen.queryByText(/Imported|No valid games|Could not read/)).not.toBeInTheDocument()
  })

  it('pluralizes "games" and omits the skipped clause when nothing was skipped', async () => {
    const user = userEvent.setup()
    render(<HistoryScreen onBack={vi.fn()} />)

    const file = new File(
      [
        JSON.stringify([
          makeEntry({ finishedAt: 'game-1' }),
          makeEntry({ finishedAt: 'game-2' }),
        ]),
      ],
      'history.json',
      { type: 'application/json' },
    )
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement
    await user.upload(fileInput, file)

    expect(await screen.findByText('Imported 2 games.')).toBeInTheDocument()
  })
})
