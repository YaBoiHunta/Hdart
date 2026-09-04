import '@testing-library/jest-dom/vitest'

// jsdom has no real media pipeline; without this, any code path that calls
// audio.play() (e.g. SoundContext's playSound) throws "not implemented".
HTMLMediaElement.prototype.play = () => Promise.resolve()

// jsdom doesn't implement AnimationEvent, and React feature-detects it at
// module load time to decide whether to wire up onAnimationEnd handling at
// all — without this polyfill (set before React is imported by any test
// file), fireEvent.animationEnd() in tests is silently a no-op.
if (typeof window.AnimationEvent === 'undefined') {
  class AnimationEventPolyfill extends Event {
    animationName: string
    elapsedTime: number
    pseudoElement: string
    constructor(type: string, init: AnimationEventInit = {}) {
      super(type, init)
      this.animationName = init.animationName ?? ''
      this.elapsedTime = init.elapsedTime ?? 0
      this.pseudoElement = init.pseudoElement ?? ''
    }
  }
  window.AnimationEvent = AnimationEventPolyfill as unknown as typeof AnimationEvent
}
