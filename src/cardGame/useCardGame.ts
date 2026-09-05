import { useState } from 'react'
import { createShuffledDeck, drawCard } from './deck'
import { applyActiveJokers, summarizeRound, JOKER_TABLE } from './jokers'
import type {
  CardDartMultiplier,
  CardDartSegment,
  CardGamePlayer,
  CardGameState,
} from './types'

export const ROUNDS = 5

let nextCardPlayerId = 1

function createEmptyState(): CardGameState {
  return {
    stage: 'setup',
    players: [],
    deck: [],
    round: 0,
    activeJokers: [],
    roundCard: null,
    currentPlayerIndex: 0,
    currentTurnDarts: [],
    multiplier: 1,
  }
}

function dartValue(segment: CardDartSegment, multiplier: CardDartMultiplier): number {
  if (segment === 'OUT') return 0
  return segment * multiplier
}

// This hook owns all state for the card mode directly via useState, and
// every action below computes the next state and calls setState itself.
// There's no action-type dispatch/reducer here on purpose — this mode is a
// standalone prototype, deliberately decoupled from src/game/gameReducer.ts
// and the standard-modes engine the rest of the app runs on.
export function useCardGame(random: () => number = Math.random) {
  const [state, setState] = useState<CardGameState>(createEmptyState)

  function addPlayer(name: string) {
    const trimmed = name.trim()
    if (!trimmed) return
    const player: CardGamePlayer = { id: nextCardPlayerId++, name: trimmed, total: 0, turns: [] }
    setState((prev) => ({ ...prev, players: [...prev.players, player] }))
  }

  function removePlayer(playerId: number) {
    setState((prev) => ({ ...prev, players: prev.players.filter((p) => p.id !== playerId) }))
  }

  function beginPlaying(players: CardGamePlayer[]) {
    if (players.length === 0) return
    const deck = createShuffledDeck(random)
    const { card, rest } = drawCard(deck)
    if (!card) return
    const joker = JOKER_TABLE[card.rank]
    setState((prev) => ({
      ...prev,
      players: players.map((p) => ({ ...p, total: 0, turns: [] })),
      deck: rest,
      round: 1,
      activeJokers: [{ ...joker, card }],
      roundCard: card,
      currentPlayerIndex: 0,
      currentTurnDarts: [],
      multiplier: 1,
      stage: 'playing',
    }))
  }

  function startGame() {
    beginPlaying(state.players)
  }

  function rematch() {
    beginPlaying(state.players)
  }

  function newGame() {
    nextCardPlayerId = 1
    setState(createEmptyState())
  }

  function setMultiplier(multiplier: CardDartMultiplier) {
    setState((prev) => ({ ...prev, multiplier: prev.multiplier === multiplier ? 1 : multiplier }))
  }

  function undoDart() {
    setState((prev) => {
      if (prev.stage !== 'playing' || prev.currentTurnDarts.length === 0) return prev
      return { ...prev, currentTurnDarts: prev.currentTurnDarts.slice(0, -1) }
    })
  }

  function throwDart(segment: CardDartSegment) {
    setState((prev) => {
      if (prev.stage !== 'playing') return prev

      const multiplier: CardDartMultiplier =
        segment === 'OUT' || segment === 50 ? 1 : prev.multiplier
      const value = dartValue(segment, multiplier)
      const darts = [...prev.currentTurnDarts, { segment, multiplier, value }]

      if (darts.length < 3) {
        return { ...prev, currentTurnDarts: darts, multiplier: 1 }
      }

      // Turn complete: score it through every active joker and bank it.
      const summary = summarizeRound(darts)
      const rawTotal = summary.rawTotal
      const adjustedTotal = applyActiveJokers(rawTotal, summary, prev.activeJokers)
      const playerIndex = prev.currentPlayerIndex
      const player = prev.players[playerIndex]
      const players = [...prev.players]
      players[playerIndex] = {
        ...player,
        total: player.total + adjustedTotal,
        turns: [...player.turns, { round: prev.round, darts, rawTotal, adjustedTotal }],
      }

      const nextPlayerIndex = (playerIndex + 1) % players.length
      const roundComplete = nextPlayerIndex === 0

      if (!roundComplete) {
        return {
          ...prev,
          players,
          currentPlayerIndex: nextPlayerIndex,
          currentTurnDarts: [],
          multiplier: 1,
        }
      }

      if (prev.round >= ROUNDS) {
        return {
          ...prev,
          players,
          stage: 'finished',
          currentPlayerIndex: nextPlayerIndex,
          currentTurnDarts: [],
          multiplier: 1,
        }
      }

      const { card, rest } = drawCard(prev.deck)
      if (!card) {
        // Deck exhausted (shouldn't happen at 5 draws from 52 cards) — end
        // the game rather than throwing.
        return {
          ...prev,
          players,
          stage: 'finished',
          currentPlayerIndex: nextPlayerIndex,
          currentTurnDarts: [],
          multiplier: 1,
        }
      }
      const joker = JOKER_TABLE[card.rank]
      return {
        ...prev,
        players,
        deck: rest,
        round: prev.round + 1,
        activeJokers: [...prev.activeJokers, { ...joker, card }],
        roundCard: card,
        currentPlayerIndex: nextPlayerIndex,
        currentTurnDarts: [],
        multiplier: 1,
      }
    })
  }

  return { state, addPlayer, removePlayer, startGame, rematch, newGame, setMultiplier, throwDart, undoDart }
}
