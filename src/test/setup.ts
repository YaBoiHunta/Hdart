import '@testing-library/jest-dom/vitest'

// jsdom has no real media pipeline; without this, any code path that calls
// audio.play() (e.g. SoundContext's playSound) throws "not implemented".
HTMLMediaElement.prototype.play = () => Promise.resolve()
