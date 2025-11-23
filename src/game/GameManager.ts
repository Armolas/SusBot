import type { Client, Conversation } from "@xmtp/node-sdk";
import type { GameDuration } from "./GameState.js";
import {
  type GameState,
  type GameSummary,
  createGameState,
  isGameActive,
  addPlayer,
  setImposter,
  recordDurationVote,
  calculateWinningDuration,
  recordVote,
  calculateVoteResults,
  determineWinner,
  resetGameState,
} from "./GameState.js";
import { getRandomWord } from "./WordList.js";
import { type ActionsContent, ContentTypeActions } from "../types/ActionsContent.js";
import { type IntentContent, ContentTypeIntent } from "../types/IntentContent.js";
import { resolveAddressToNameCached } from "../helpers/nameResolver.js";

/**
 * GameManager - Core game orchestration class
 * Manages game flow, state transitions, and player interactions
 */
export class GameManager {
  private games: Map<string, GameState> = new Map();
  private timers: Map<string, NodeJS.Timeout> = new Map();
  private client: any;

  constructor(client: any) {
    this.client = client;
  }

  /**
   * Get or create game state for a group
   */
  private getGameState(groupId: string): GameState {
    let gameState = this.games.get(groupId);
    if (!gameState) {
      gameState = createGameState(groupId);
      this.games.set(groupId, gameState);
    }
    return gameState;
  }

  /**
   * Start a new game - create duration voting poll
   */
  async startGame(conversation: Conversation): Promise<void> {
    const groupId = conversation.id;
    const gameState = this.getGameState(groupId);

    // Check if game already active
    if (isGameActive(gameState)) {
      await conversation.send(
        "❌ A game is already in progress! Wait for it to finish before starting a new one."
      );
      return;
    }

    // Get group members
    const members = await conversation.members();

    if (members.length < 3) {
      await conversation.send(
        "❌ You need at least 3 players to start the game! Invite more friends to the group."
      );
      return;
    }

    // Reset state
    resetGameState(gameState);
    gameState.status = 'voting_duration';

    // Create duration voting actions
    const actionsContent: ActionsContent = {
      id: `duration-${Date.now()}`,
      description: "⏱️ How long should the discussion phase be?",
      actions: [
        { id: '5', label: '5 minutes ⚡', style: 'primary' },
        { id: '7', label: '7 minutes ⏰', style: 'primary' },
        { id: '10', label: '10 minutes 🕐', style: 'primary' },
      ]
    };

    await conversation.send(
      "🎮 **SUSBOT GAME STARTING!**\n\n" +
      "Tap a button to vote for discussion time:"
    );

    await conversation.send(actionsContent, ContentTypeActions);

    // Set timeout for voting (60 seconds)
    this.setTimer(groupId, async () => {
      await this.finalizeDurationVote(conversation);
    }, 60000);
  }

  /**
   * Handle duration vote from a player
   */
  async handleDurationVote(
    conversation: Conversation,
    voterInboxId: string,
    duration: GameDuration
  ): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (gameState.status !== 'voting_duration') {
      return; // Not in voting phase
    }

    recordDurationVote(gameState, voterInboxId, duration);
    console.log(`📊 Duration vote received: ${duration} minutes from ${voterInboxId}`);
  }

  /**
   * Finalize duration voting and proceed to role assignment
   */
  private async finalizeDurationVote(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (gameState.status !== 'voting_duration') {
      return;
    }

    const winningDuration = calculateWinningDuration(gameState);

    if (!winningDuration) {
      await conversation.send(
        "❌ No votes received! Game cancelled. Type `/imposter start` to try again."
      );
      resetGameState(gameState);
      return;
    }

    gameState.selectedDuration = winningDuration;

    await conversation.send(
      `✅ Duration selected: **${winningDuration} minutes**\n\n` +
      "🎭 Assigning roles now..."
    );

    // Move to role assignment
    await this.assignRoles(conversation);
  }

  /**
   * Assign roles to players and DM them
   */
  private async assignRoles(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);
    gameState.status = 'assigning_roles';

    // Get all group members
    const members = await conversation.members();
    const memberInboxIds = members.map(m => m.inboxId);

    // Filter out the bot itself
    const players = memberInboxIds.filter(id => id !== this.client.inboxId);

    if (players.length < 3) {
      await conversation.send("❌ Not enough players! Need at least 3 players.");
      resetGameState(gameState);
      return;
    }

    // Add players to game state
    for (const member of members) {
      if (member.inboxId !== this.client.inboxId) {
        // Get address from inbox state
        const inboxState = await this.client.preferences.inboxStateFromInboxIds([
          member.inboxId,
        ]);
        const address = inboxState[0]?.identifiers[0]?.identifier || member.inboxId;
        addPlayer(gameState, member.inboxId, address);
      }
    }

    // Randomly select imposter
    const randomIndex = Math.floor(Math.random() * players.length);
    const imposterInboxId = players[randomIndex];
    setImposter(gameState, imposterInboxId);

    // Select secret word
    const secretWord = getRandomWord();
    gameState.secretWord = secretWord;

    console.log(`🎭 Imposter selected: ${imposterInboxId}`);
    console.log(`🔒 Secret word: ${secretWord}`);

    // DM each player their role
    let dmSuccessCount = 0;
    for (const player of gameState.players.values()) {
      try {
        // Create DM conversation using inbox ID (XMTP Node SDK)
        const playerConvo = await this.client.conversations.newDm(
          player.inboxId
        );

        if (player.isImposter) {
          await playerConvo.send(
            "🕵️ **YOU ARE THE IMPOSTER!**\n\n" +
            "You do NOT know the secret word.\n\n" +
            "Your goal: Blend in with the discussion without revealing that you don't know the word. " +
            "If the group doesn't vote you out, you win!"
          );
        } else {
          await playerConvo.send(
            `✨ **Your secret word is:**\n\n🔒 **${secretWord}**\n\n` +
            "Discuss this word carefully to identify the imposter, but don't be too obvious!"
          );
        }
        dmSuccessCount++;
        console.log(`✅ DM sent to ${player.address}`);
      } catch (error) {
        console.error(`❌ Failed to DM player ${player.address}:`, error);
      }
    }

    if (dmSuccessCount === 0) {
      await conversation.send(
        "❌ Failed to send DMs to players. Make sure all players have XMTP enabled!"
      );
      resetGameState(gameState);
      return;
    }

    await conversation.send(
      `✅ Roles assigned! ${dmSuccessCount}/${players.length} players received their roles.\n\n` +
      "🎲 Randomly selecting someone to start..."
    );

    // Random delay before selecting speaker
    setTimeout(async () => {
      await this.selectRandomSpeaker(conversation);
    }, 2000);
  }

  /**
   * Select random player to start discussion
   */
  private async selectRandomSpeaker(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    const playerArray = Array.from(gameState.players.values());
    const randomIndex = Math.floor(Math.random() * playerArray.length);
    const speaker = playerArray[randomIndex];

    gameState.currentSpeakerInboxId = speaker.inboxId;

    // Resolve speaker's name (ENS/Basename or shortened address)
    const speakerName = await resolveAddressToNameCached(speaker.address);

    await conversation.send(
      `🎤 **${speakerName}** will start the discussion!\n\n` +
      `⏱️ You have **${gameState.selectedDuration} minutes** to discuss.\n\n` +
      "💬 Talk about the word to find the imposter!\n\n" +
      "GO! 🚀"
    );

    await this.startDiscussionPhase(conversation);
  }

  /**
   * Start discussion phase with timer
   */
  private async startDiscussionPhase(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);
    gameState.status = 'discussion';
    gameState.startedAt = new Date();

    const durationMs = (gameState.selectedDuration || 5) * 60 * 1000;
    gameState.discussionEndTime = new Date(Date.now() + durationMs);

    // Set timer for end of discussion
    this.setTimer(conversation.id, async () => {
      await this.endDiscussionPhase(conversation);
    }, durationMs);

    console.log(`⏱️ Discussion started for ${gameState.selectedDuration} minutes`);
  }

  /**
   * End discussion and start voting
   */
  private async endDiscussionPhase(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (gameState.status !== 'discussion') {
      return;
    }

    await conversation.send(
      "⏰ **TIME'S UP!**\n\n" +
      "🗳️ **Voting begins now!**\n\n" +
      "Vote for who you think is the imposter..."
    );

    await this.startVotingPhase(conversation);
  }

  /**
   * Start voting phase
   */
  private async startVotingPhase(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);
    gameState.status = 'voting';
    gameState.votingStartedAt = new Date();

    // Create voting actions with all players (resolve names)
    const playerArray = Array.from(gameState.players.values());
    const actions = await Promise.all(
      playerArray.map(async (player) => ({
        id: player.inboxId,
        label: await resolveAddressToNameCached(player.address),
        style: 'secondary' as const,
      }))
    );

    const actionsContent: ActionsContent = {
      id: `voting-${Date.now()}`,
      description: "🗳️ Who is the IMPOSTER?",
      actions,
    };

    await conversation.send(actionsContent, ContentTypeActions);

    // Set timeout for voting (60 seconds)
    this.setTimer(conversation.id, async () => {
      await this.finalizeVoting(conversation);
    }, 60000);

    console.log("🗳️ Voting phase started");
  }

  /**
   * Handle player vote
   */
  async handlePlayerVote(
    conversation: Conversation,
    voterInboxId: string,
    voteeInboxId: string
  ): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (gameState.status !== 'voting') {
      return;
    }

    recordVote(gameState, voterInboxId, voteeInboxId);
    console.log(`🗳️ Vote recorded: ${voterInboxId} voted for ${voteeInboxId}`);
  }

  /**
   * Finalize voting and end game
   */
  private async finalizeVoting(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (gameState.status !== 'voting') {
      return;
    }

    const voteResults = calculateVoteResults(gameState);

    if (!voteResults) {
      await conversation.send(
        "❌ No votes received! Game ends in a draw."
      );
      resetGameState(gameState);
      return;
    }

    const { votedOutInboxId, voteCount } = voteResults;
    const votedOutPlayer = gameState.players.get(votedOutInboxId);

    if (!votedOutPlayer) {
      await conversation.send("❌ Error processing votes. Game cancelled.");
      resetGameState(gameState);
      return;
    }

    const winner = determineWinner(gameState, votedOutInboxId);
    gameState.votedOutInboxId = votedOutInboxId;
    gameState.winner = winner;

    // Resolve names for all players in vote summary
    const votedOutName = await resolveAddressToNameCached(votedOutPlayer.address);
    const imposterPlayer = gameState.players.get(gameState.imposterInboxId!);
    const imposterName = imposterPlayer ? await resolveAddressToNameCached(imposterPlayer.address) : 'Unknown';

    // Build vote summary with resolved names
    const voteSummaryPromises = Array.from(gameState.votes.entries()).map(async ([voter, votee]) => {
      const voterPlayer = gameState.players.get(voter);
      const voteePlayer = gameState.players.get(votee);
      const voterName = voterPlayer ? await resolveAddressToNameCached(voterPlayer.address) : voter;
      const voteeName = voteePlayer ? await resolveAddressToNameCached(voteePlayer.address) : votee;
      return `• ${voterName} → ${voteeName}`;
    });
    const voteSummary = (await Promise.all(voteSummaryPromises)).join('\n');

    // Send results
    await conversation.send(
      `📊 **VOTING RESULTS**\n\n` +
      `Most Voted: **${votedOutName}** (${voteCount} votes)\n\n` +
      `${votedOutPlayer.isImposter ? '✅ Correct!' : '❌ Wrong!'}\n\n` +
      `🕵️ The IMPOSTER was: **${imposterName}**\n` +
      `🔒 The secret word was: **${gameState.secretWord}**\n\n` +
      `🏆 **WINNER: ${winner === 'imposter' ? 'IMPOSTER' : 'GROUP'}**\n\n` +
      `**Vote Breakdown:**\n${voteSummary}\n\n` +
      `Thanks for playing! Type \`/imposter start\` to play again! 🎮`
    );

    gameState.status = 'ended';

    // Clean up after 5 seconds
    setTimeout(() => {
      resetGameState(gameState);
      console.log(`🧹 Game state reset for ${conversation.id}`);
    }, 5000);
  }

  /**
   * Set or update a timer for a group
   */
  private setTimer(groupId: string, callback: () => void, delay: number): void {
    // Clear existing timer
    const existingTimer = this.timers.get(groupId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Set new timer
    const timer = setTimeout(callback, delay);
    this.timers.set(groupId, timer);
  }

  /**
   * Clear timer for a group
   */
  private clearTimer(groupId: string): void {
    const timer = this.timers.get(groupId);
    if (timer) {
      clearTimeout(timer);
      this.timers.delete(groupId);
    }
  }

  /**
   * Get game status for a group
   */
  getGameStatus(groupId: string): GameState | undefined {
    return this.games.get(groupId);
  }

  /**
   * Cancel active game
   */
  async cancelGame(conversation: Conversation): Promise<void> {
    const gameState = this.getGameState(conversation.id);

    if (!isGameActive(gameState)) {
      await conversation.send("❌ No active game to cancel.");
      return;
    }

    this.clearTimer(conversation.id);
    resetGameState(gameState);

    await conversation.send("🛑 Game cancelled.");
  }

  /**
   * Cleanup on shutdown
   */
  shutdown(): void {
    // Clear all timers
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
    console.log("🧹 GameManager shut down, all timers cleared");
  }
}
