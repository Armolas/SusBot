import {
  createSigner,
  getEncryptionKeyFromHex,
  logAgentDetails,
  validateEnvironment,
} from "./helpers/client.js";
import { Client, type XmtpEnv } from "@xmtp/node-sdk";
import { GameManager } from "./game/GameManager.js";
import { PollCodec, type PollResponse } from "./types/PollContent.js";
import { handleTextMessage, handlePollResponse } from "./handlers/messageHandlers.js";

// Validate required environment variables
const { WALLET_KEY, ENCRYPTION_KEY, XMTP_ENV } = validateEnvironment([
  "WALLET_KEY",
  "ENCRYPTION_KEY",
  "XMTP_ENV",
]);

async function main() {
  console.log("🕵️ Starting SusBot - The Social Deduction Game Agent...");

  try {
    // Create XMTP client
    const signer = createSigner(WALLET_KEY);
    const dbEncryptionKey = getEncryptionKeyFromHex(ENCRYPTION_KEY);

    const client = await Client.create(signer, {
      dbEncryptionKey,
      env: XMTP_ENV as XmtpEnv,
      codecs: [new PollCodec()],
    });

    void logAgentDetails(client);

    // Initialize game manager
    const gameManager = new GameManager(client);
    globalGameManager = gameManager;

    // Sync conversations
    console.log("🔄 Syncing conversations...");
    await client.conversations.sync();

    console.log("👂 Listening for messages...");

    // Keep the bot running with proper error handling
    while (true) {
      try {
        const stream = await client.conversations.streamAllMessages();

        for await (const message of stream) {
          try {
            // Skip messages from the bot itself
            if (!message || message.senderInboxId.toLowerCase() === client.inboxId.toLowerCase()) {
              continue;
            }

            console.log(
              `📨 Received: ${message.contentType?.typeId} from ${message.senderInboxId}`
            );

            const conversation = await client.conversations.getConversationById(
              message.conversationId
            );

            if (!conversation) {
              console.log("❌ Unable to find conversation, skipping");
              continue;
            }

            // Only process group messages (skip DMs)
            // In XMTP Node SDK, groups have 'members()' method, DMs don't
            const isGroup = typeof (conversation as any).members === 'function';

            console.log(`🔍 Conversation type check - isGroup: ${isGroup}, id: ${conversation.id}`);

            if (!isGroup) {
              console.log("ℹ️ Skipping DM message (game only works in groups)");
              continue;
            }

            // Get sender inbox ID
            const senderInboxId = message.senderInboxId;

            // Handle different message types
            if (message.contentType?.typeId === "text") {
              await handleTextMessage(
                conversation as any,
                message.content as string,
                senderInboxId,
                gameManager
              );
            } else if (message.contentType?.typeId === "poll") {
              // Handle poll responses (if using custom poll content type)
              const pollResponse = message.content as any as PollResponse;
              await handlePollResponse(
                conversation as any,
                pollResponse.pollId,
                pollResponse.optionId,
                senderInboxId,
                gameManager
              );
            } else {
              // Ignore other content types
              continue;
            }
          } catch (messageError: unknown) {
            const errorMessage = messageError instanceof Error ? messageError.message : String(messageError);
            console.error("❌ Error processing individual message:", errorMessage);
            try {
              const conversation = await client.conversations.getConversationById(
                message?.conversationId || ""
              );
              if (conversation) {
                await conversation.send(
                  `❌ Error processing message: ${errorMessage}`
                );
              }
            } catch (sendError) {
              console.error("❌ Failed to send error message to conversation:", sendError);
            }
          }
        }
      } catch (streamError: unknown) {
        const errorMessage = streamError instanceof Error ? streamError.message : String(streamError);
        console.error("❌ Stream error occurred:", errorMessage);
        console.log("🔄 Attempting to reconnect in 5 seconds...");
        await new Promise(resolve => setTimeout(resolve, 5000));

        // Re-sync conversations before attempting to recreate stream
        try {
          await client.conversations.sync();
          console.log("✅ Conversations re-synced successfully");
        } catch (syncError) {
          console.error("❌ Failed to sync conversations:", syncError);
        }
      }
    }
  } catch (error) {
    console.error("💥 Initialization error:", error);
    console.log("🔄 Bot failed to initialize. Please check your configuration and try again.");
    process.exit(1);
  }
}

// Global game manager for shutdown handling
let globalGameManager: GameManager | null = null;

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n👋 Shutting down SusBot...");
  if (globalGameManager) {
    globalGameManager.shutdown();
  }
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\n👋 Shutting down SusBot...");
  if (globalGameManager) {
    globalGameManager.shutdown();
  }
  process.exit(0);
});

// Start the bot
main().catch((error) => {
  console.error("💥 Unhandled error:", error);
  process.exit(1);
});
