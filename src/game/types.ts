export const PHASES = {
  MODE_SELECT: 'mode-select',
  PLAYER_SETUP: 'player-setup',
  GAME: 'game',
} as const

export type Phase = (typeof PHASES)[keyof typeof PHASES]

export type Multiplier = 1 | 2 | 3
export type ThrowSegment = number | 'OUT'

export interface ThrowRecord {
  segment: ThrowSegment
  multiplier: Multiplier
  value: number
}

export interface TurnHistoryEntry {
  throws: ThrowRecord[]
  total: number
  bust: boolean
}

interface PlayerBase {
  id: number
  name: string
  turnHistory: TurnHistoryEntry[]
}

export interface CountdownPlayer extends PlayerBase {
  score: number
}

export interface ProgressionPlayer extends PlayerBase {
  targetIndex: number
}

export type Player = CountdownPlayer | ProgressionPlayer

export function isCountdownPlayer(player: Player): player is CountdownPlayer {
  return 'score' in player
}

export function isProgressionPlayer(player: Player): player is ProgressionPlayer {
  return 'targetIndex' in player
}

interface ModeBase {
  id: string
  label: string
}

export interface CountdownMode extends ModeBase {
  family: 'countdown'
  startingScore: number
}

export interface ProgressionMode extends ModeBase {
  family: 'progression'
  sequence: number[]
}

export type Mode = CountdownMode | ProgressionMode

export interface CurrentTurn {
  throws: ThrowRecord[]
  startScore: number
  startTargetIndex: number
}

export interface GameState {
  phase: Phase
  modeId: string | null
  players: Player[]
  currentPlayerIndex: number
  currentTurn: CurrentTurn
  activeMultiplier: Multiplier
  winnerId: number | null
  historyRecorded: boolean
}

export type Action =
  | { type: 'SELECT_MODE'; modeId: string }
  | { type: 'BACK_TO_MODE_SELECT' }
  | { type: 'ADD_PLAYER'; name: string }
  | { type: 'REMOVE_PLAYER'; playerId: number }
  | { type: 'START_GAME' }
  | { type: 'SET_MULTIPLIER'; multiplier: Multiplier }
  | { type: 'THROW_DART'; segment: ThrowSegment }
  | { type: 'UNDO' }
  | { type: 'NEW_GAME' }
  | { type: 'REMATCH' }
  | { type: 'MARK_HISTORY_RECORDED' }

export interface GameHistoryPlayerSummary {
  name: string
  won: boolean
  average: number | null
  turns: number
}

export interface GameHistoryEntry {
  finishedAt: string
  modeId: string | null
  modeLabel: string
  players: GameHistoryPlayerSummary[]
}
