import type { Conversation } from "@xmtp/node-sdk";
import type { GameManager } from "../game/GameManager.js";
import type { GameDuration } from "../game/GameState.js";

/**
 * Handle text messages
 */
export async function handleTextMessage(
  conversation: Conversation,
  messageContent: string,
  senderInboxId: string,
  gameManager: GameManager
): Promise<void> {
  const command = messageContent.trim();
  const lowerCommand = command.toLowerCase();

  // Check if player is registering their name (/join <name>)
  const gameState = gameManager.getGameStatus(conversation.id);
  if (gameState?.status === 'registering_names') {
    if (command.startsWith('/join ')) {
      const displayName = command.substring(6).trim();
      if (displayName) {
        await gameManager.registerPlayer(conversation, senderInboxId, displayName);
      } else {
        await conversation.send("❌ Please provide a name: `/join YourName`");
      }
      return;
    }
    // Ignore all other messages during registration phase
    return;
  }

  // Handle game commands
  switch (true) {
    case lowerCommand === "/imposter start":
    case lowerCommand === "/start":
      await gameManager.startGame(conversation);
      break;

    case lowerCommand === "/imposter cancel":
    case lowerCommand === "/cancel":
      await gameManager.cancelGame(conversation);
      break;

    case lowerCommand === "/imposter help":
    case lowerCommand === "/help":
      await handleHelpCommand(conversation);
      break;

    case lowerCommand === "/imposter status":
    case lowerCommand === "/status":
      await handleStatusCommand(conversation, gameManager);
      break;

    // Handle number responses for polls (fallback)
    case /^[1-3]$/.test(lowerCommand):
      await handleNumberResponse(conversation, lowerCommand, senderInboxId, gameManager);
      break;

    default:
      // Ignore other messages during game
      return;
  }
}

/**
 * Handle Intent message (button click response)
 */
export async function handleIntentMessage(
  conversation: Conversation,
  intentContent: { id: string; actionId: string },
  voterInboxId: string,
  gameManager: GameManager
): Promise<void> {
  const gameState = gameManager.getGameStatus(conversation.id);

  if (!gameState) {
    return;
  }

  const { id, actionId } = intentContent;

  // Check if this is a duration vote
  if (id.startsWith('duration-')) {
    const duration = parseInt(actionId) as GameDuration;
    if ([5, 7, 10].includes(duration)) {
      await gameManager.handleDurationVote(conversation, voterInboxId, duration);
    }
  }

  // Check if this is a player vote
  else if (id.startsWith('voting-')) {
    await gameManager.handlePlayerVote(conversation, voterInboxId, actionId);
  }
}

/**
 * Handle number response as fallback for polls
 */
async function handleNumberResponse(
  conversation: Conversation,
  number: string,
  senderInboxId: string,
  gameManager: GameManager
): Promise<void> {
  const gameState = gameManager.getGameStatus(conversation.id);

  if (!gameState) {
    return;
  }

  // Duration voting (1=5min, 2=7min, 3=10min)
  if (gameState.status === 'voting_duration') {
    const durationMap: Record<string, GameDuration> = {
      '1': 5,
      '2': 7,
      '3': 10,
    };
    const duration = durationMap[number];
    if (duration) {
      await gameManager.handleDurationVote(conversation, senderInboxId, duration);
    }
  }

  // Player voting (number corresponds to player index)
  else if (gameState.status === 'voting') {
    const playerIndex = parseInt(number) - 1;
    const players = Array.from(gameState.players.values());
    if (playerIndex >= 0 && playerIndex < players.length) {
      await gameManager.handlePlayerVote(
        conversation,
        senderInboxId,
        players[playerIndex].inboxId
      );
    }
  }
}

/**
 * Handle help command
 */
async function handleHelpCommand(conversation: Conversation): Promise<void> {
  const helpMessage = `
🎮 **IMPOSTER GAME - How to Play**

🕵️ **Objective:**
- Find the imposter among your group!
- Normal players know a secret word
- The imposter doesn't know the word
- Discuss to find who doesn't know!

📝 **Commands:**
\`/imposter start\` - Start a new game
\`/imposter cancel\` - Cancel current game
\`/imposter status\` - Check game status
\`/imposter help\` - Show this help

🎯 **Game Flow:**
1️⃣ Register with \`/join YourName\`
2️⃣ Vote for discussion time (5/7/10 min)
3️⃣ Receive your role via DM
4️⃣ Discuss the secret word
5️⃣ Vote for the imposter
6️⃣ See results!

💡 **Tips:**
• Need 3+ players to register
• Normal players: Mention the word subtly
• Imposter: Try to blend in!
• Winner: Group if imposter caught, Imposter if not

Ready? Type \`/imposter start\` to begin! 🚀
`;

  await conversation.send(helpMessage);
}

/**
 * Handle status command
 */
async function handleStatusCommand(
  conversation: Conversation,
  gameManager: GameManager
): Promise<void> {
  const gameState = gameManager.getGameStatus(conversation.id);

  if (!gameState || gameState.status === 'idle') {
    await conversation.send(
      "ℹ️ No active game. Type `/imposter start` to begin!"
    );
    return;
  }

  let statusMessage = `📊 **Game Status**\n\n`;

  switch (gameState.status) {
    case 'registering_names':
      statusMessage += `Phase: 📝 Registering players\n`;
      statusMessage += `Registered: ${gameState.players.size}/3 minimum`;
      break;

    case 'voting_duration':
      statusMessage += `Phase: ⏱️ Voting for duration\n`;
      statusMessage += `Votes: ${gameState.durationVotes.length} received`;
      break;

    case 'assigning_roles':
      statusMessage += `Phase: 🎭 Assigning roles\n`;
      statusMessage += `Players: ${gameState.players.size}`;
      break;

    case 'discussion':
      const timeLeft = gameState.discussionEndTime
        ? Math.max(0, Math.floor((gameState.discussionEndTime.getTime() - Date.now()) / 1000))
        : 0;
      const minutes = Math.floor(timeLeft / 60);
      const seconds = timeLeft % 60;
      statusMessage += `Phase: 💬 Discussion\n`;
      statusMessage += `Time Left: ${minutes}:${seconds.toString().padStart(2, '0')}\n`;
      statusMessage += `Players: ${gameState.players.size}`;
      break;

    case 'voting':
      statusMessage += `Phase: 🗳️ Voting\n`;
      statusMessage += `Votes: ${gameState.votes.size}/${gameState.players.size}`;
      break;

    case 'ended':
      statusMessage += `Phase: ✅ Ended\n`;
      statusMessage += `Winner: ${gameState.winner === 'imposter' ? '🕵️ Imposter' : '👥 Group'}`;
      break;
  }

  await conversation.send(statusMessage);
}
