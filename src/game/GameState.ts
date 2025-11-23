/**
 * Game State Management
 * Defines the structure and types for Imposter Game state
 */

export type GameStatus =
  | 'idle'              // No game running
  | 'voting_duration'   // Voting on game duration
  | 'assigning_roles'   // DMing roles to players
  | 'discussion'        // Discussion phase active
  | 'voting'            // Voting on imposter
  | 'ended';            // Game ended

export type GameDuration = 5 | 7 | 10; // minutes

export interface Player {
  inboxId: string;
  address: string;
  isImposter: boolean;
  hasVoted: boolean;
  votedFor?: string; // inboxId of voted player
}

export interface DurationVote {
  voterInboxId: string;
  duration: GameDuration;
}

export interface GameState {
  groupId: string;
  status: GameStatus;

  // Duration voting phase
  durationVotes: DurationVote[];
  selectedDuration?: GameDuration;

  // Players
  players: Map<string, Player>; // inboxId -> Player
  imposterInboxId?: string;
  secretWord?: string;

  // Discussion phase
  startedAt?: Date;
  discussionEndTime?: Date;
  currentSpeakerInboxId?: string;

  // Voting phase
  votingStartedAt?: Date;
  votes: Map<string, string>; // voterInboxId -> voteeInboxId

  // Game results
  votedOutInboxId?: string;
  winner?: 'imposter' | 'group';
}

export interface GameSummary {
  imposterInboxId: string;
  imposterAddress: string;
  secretWord: string;
  votedOutInboxId: string;
  votedOutAddress: string;
  votes: Array<{
    voter: string;
    votee: string;
  }>;
  winner: 'imposter' | 'group';
  totalPlayers: number;
}

/**
 * Create a new empty game state
 */
export function createGameState(groupId: string): GameState {
  return {
    groupId,
    status: 'idle',
    durationVotes: [],
    players: new Map(),
    votes: new Map(),
  };
}

/**
 * Check if a game is active
 */
export function isGameActive(state: GameState): boolean {
  return state.status !== 'idle' && state.status !== 'ended';
}

/**
 * Get player count
 */
export function getPlayerCount(state: GameState): number {
  return state.players.size;
}

/**
 * Get player by inbox ID
 */
export function getPlayer(state: GameState, inboxId: string): Player | undefined {
  return state.players.get(inboxId);
}

/**
 * Add a player to the game
 */
export function addPlayer(
  state: GameState,
  inboxId: string,
  address: string
): void {
  if (!state.players.has(inboxId)) {
    state.players.set(inboxId, {
      inboxId,
      address,
      isImposter: false,
      hasVoted: false,
    });
  }
}

/**
 * Set the imposter
 */
export function setImposter(state: GameState, inboxId: string): void {
  const player = state.players.get(inboxId);
  if (player) {
    player.isImposter = true;
    state.imposterInboxId = inboxId;
  }
}

/**
 * Record a duration vote
 */
export function recordDurationVote(
  state: GameState,
  voterInboxId: string,
  duration: GameDuration
): void {
  // Remove existing vote from this voter
  state.durationVotes = state.durationVotes.filter(
    v => v.voterInboxId !== voterInboxId
  );

  // Add new vote
  state.durationVotes.push({ voterInboxId, duration });
}

/**
 * Calculate winning duration from votes
 */
export function calculateWinningDuration(state: GameState): GameDuration | null {
  if (state.durationVotes.length === 0) return null;

  const counts = new Map<GameDuration, number>();

  for (const vote of state.durationVotes) {
    counts.set(vote.duration, (counts.get(vote.duration) || 0) + 1);
  }

  let maxCount = 0;
  let winningDuration: GameDuration | null = null;

  for (const [duration, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      winningDuration = duration;
    }
  }

  return winningDuration;
}

/**
 * Record a player vote
 */
export function recordVote(
  state: GameState,
  voterInboxId: string,
  voteeInboxId: string
): void {
  state.votes.set(voterInboxId, voteeInboxId);

  const voter = state.players.get(voterInboxId);
  if (voter) {
    voter.hasVoted = true;
    voter.votedFor = voteeInboxId;
  }
}

/**
 * Calculate vote results
 */
export function calculateVoteResults(state: GameState): {
  votedOutInboxId: string;
  voteCount: number;
} | null {
  if (state.votes.size === 0) return null;

  const counts = new Map<string, number>();

  for (const voteeInboxId of state.votes.values()) {
    counts.set(voteeInboxId, (counts.get(voteeInboxId) || 0) + 1);
  }

  let maxCount = 0;
  let votedOutInboxId: string | null = null;

  for (const [inboxId, count] of counts.entries()) {
    if (count > maxCount) {
      maxCount = count;
      votedOutInboxId = inboxId;
    }
  }

  if (!votedOutInboxId) return null;

  return {
    votedOutInboxId,
    voteCount: maxCount,
  };
}

/**
 * Determine game winner
 */
export function determineWinner(state: GameState, votedOutInboxId: string): 'imposter' | 'group' {
  return votedOutInboxId === state.imposterInboxId ? 'group' : 'imposter';
}

/**
 * Reset game state
 */
export function resetGameState(state: GameState): void {
  state.status = 'idle';
  state.durationVotes = [];
  state.selectedDuration = undefined;
  state.players.clear();
  state.imposterInboxId = undefined;
  state.secretWord = undefined;
  state.startedAt = undefined;
  state.discussionEndTime = undefined;
  state.currentSpeakerInboxId = undefined;
  state.votingStartedAt = undefined;
  state.votes.clear();
  state.votedOutInboxId = undefined;
  state.winner = undefined;
}
