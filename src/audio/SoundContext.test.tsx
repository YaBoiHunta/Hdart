import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SoundProvider, useSound } from './SoundContext'

beforeEach(() => {
  localStorage.clear()
})

function Consumer() {
  const { soundEnabled, toggleSound, playSound } = useSound()
  return (
    <div>
      <span>{soundEnabled ? 'on' : 'off'}</span>
      <button onClick={toggleSound}>toggle</button>
      <button onClick={() => playSound('test-sound')}>play</button>
    </div>
  )
}

describe('SoundProvider/useSound', () => {
  it('defaults to sound enabled when nothing is persisted', () => {
    render(
      <SoundProvider>
        <Consumer />
      </SoundProvider>,
    )
    expect(screen.getByText('on')).toBeInTheDocument()
  })

  it('toggling flips the displayed state and persists it', async () => {
    const user = userEvent.setup()
    render(
      <SoundProvider>
        <Consumer />
      </SoundProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    expect(screen.getByText('off')).toBeInTheDocument()
    expect(JSON.parse(localStorage.getItem('hdart:sound-settings') ?? '{}')).toEqual({
      soundEnabled: false,
    })
  })

  it('restores a persisted soundEnabled: false on next render', () => {
    localStorage.setItem('hdart:sound-settings', JSON.stringify({ soundEnabled: false }))
    render(
      <SoundProvider>
        <Consumer />
      </SoundProvider>,
    )
    expect(screen.getByText('off')).toBeInTheDocument()
  })

  it('playSound plays audio when enabled, and does not when muted', async () => {
    const user = userEvent.setup()
    const playSpy = vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue()
    render(
      <SoundProvider>
        <Consumer />
      </SoundProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'play' }))
    expect(playSpy).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: 'toggle' }))
    await user.click(screen.getByRole('button', { name: 'play' }))
    expect(playSpy).toHaveBeenCalledTimes(1)

    playSpy.mockRestore()
  })

  it('swallows a rejected play() (missing asset or autoplay restriction) without throwing', async () => {
    const user = userEvent.setup()
    const playSpy = vi
      .spyOn(window.HTMLMediaElement.prototype, 'play')
      .mockRejectedValue(new Error('not allowed'))
    render(
      <SoundProvider>
        <Consumer />
      </SoundProvider>,
    )

    await user.click(screen.getByRole('button', { name: 'play' }))
    expect(playSpy).toHaveBeenCalledTimes(1)

    playSpy.mockRestore()
  })

  it('throws when used outside a SoundProvider', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => render(<Consumer />)).toThrow('useSound must be used within a SoundProvider')
    consoleSpy.mockRestore()
    cleanup()
  })
})
