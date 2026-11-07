import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import NumberPad from './NumberPad'
import { SoundProvider } from '../audio/SoundContext'
import { initialState, PHASES } from '../game/gameReducer'
import { getModeById } from '../game/modes'
import type { GameState } from '../game/types'

function setup(modeId = '301', overrides: Partial<GameState> = {}) {
  const mode = getModeById(modeId)!
  const state: GameState = { ...initialState, phase: PHASES.GAME, modeId, ...overrides }
  const dispatch = vi.fn()
  render(
    <SoundProvider>
      <NumberPad state={state} dispatch={dispatch} mode={mode} />
    </SoundProvider>,
  )
  return { dispatch, user: userEvent.setup() }
}

describe('NumberPad keyboard entry', () => {
  it('throws a single digit on Enter', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('5{Enter}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'THROW_DART', segment: 5 })
  })

  it('combines two digits into one segment', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('20{Enter}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'THROW_DART', segment: 20 })
  })

  it('does nothing on Enter with an empty buffer', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Enter}')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('D and T dispatch the multiplier toggle', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('d')
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_MULTIPLIER', multiplier: 2 })
    await user.keyboard('T')
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'SET_MULTIPLIER', multiplier: 3 })
  })

  it('treats 0 as OUT and 50 as the bullseye', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('0{Enter}50{Enter}')
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'THROW_DART', segment: 'OUT' })
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'THROW_DART', segment: 50 })
  })

  it('Backspace and Escape edit the pending number', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('25{Backspace}{Enter}')
    expect(dispatch).toHaveBeenLastCalledWith({ type: 'THROW_DART', segment: 2 })
    await user.keyboard('1{Escape}{Enter}')
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  it('ignores keys while typing in a text input', async () => {
    const { dispatch, user } = setup()
    const input = document.createElement('input')
    document.body.appendChild(input)
    input.focus()
    await user.keyboard('5{Enter}d')
    expect(dispatch).not.toHaveBeenCalled()
    input.remove()
  })

  it('ignores D/T and 50 in Around the World', async () => {
    const { dispatch, user } = setup('around-the-world')
    await user.keyboard('d')
    expect(dispatch).not.toHaveBeenCalled()
    await user.keyboard('50{Enter}')
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'THROW_DART', segment: 50 })
  })
})
