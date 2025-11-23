# SusBot 🕵️

**The social deduction game bot for XMTP group chats**

SusBot runs the classic "Imposter" game where players try to find the sus among them! Normal players know a secret word, but the imposter doesn't. Can you catch them before time runs out?

**✨ Features:**
- 🏷️ ENS/Basename support - see readable names!
- 📱 Mobile-first - works on all XMTP apps
- 🎮 Full game mechanics - voting, timers, DMs
- 🌍 Multi-group - run games everywhere simultaneously

## 🎮 How to Play

1. **Start the game** - Any group member types `/imposter start`
2. **Vote for time** - Choose discussion duration (5, 7, or 10 minutes)
3. **Get your role** - Receive a DM with your role and secret word
4. **Discuss!** - Talk about the word to identify the imposter
5. **Vote** - Vote for who you think is the imposter
6. **Results!** - See if the group caught the imposter

### Game Roles

- **Normal Players**: Receive the secret word via DM. Discuss it subtly to identify the imposter
- **Imposter**: Doesn't know the word. Must blend in without being obvious

### Winning

- **Group wins** if they vote out the imposter
- **Imposter wins** if they avoid being voted out

## 🚀 Setup & Installation

### Prerequisites

- Node.js v20 or higher
- An XMTP-compatible wallet
- Yarn or npm

### Installation

```bash
# Clone and install
cd imposter-game-bot
yarn install

# Generate wallet and encryption keys
yarn gen:keys

# Start the bot
yarn dev
```

### Configuration

The `yarn gen:keys` command creates a `.env` file with:

```env
WALLET_KEY=0x...              # Bot's wallet private key
ENCRYPTION_KEY=...            # XMTP database encryption key
XMTP_ENV=production           # XMTP network (dev or production)
```

## 📝 Commands

### In-Game Commands

| Command | Description |
|---------|-------------|
| `/imposter start` | Start a new game |
| `/imposter cancel` | Cancel the current game |
| `/imposter status` | Check current game status |
| `/imposter help` | Show help message |

### Bot Commands

```bash
yarn dev          # Run in development mode with hot reload
yarn build        # Build TypeScript to JavaScript
yarn start        # Run production build
yarn gen:keys     # Generate new wallet/encryption keys
```

## 🎯 Game Flow

### 1. Initialization Phase
```
User: /imposter start
Bot: Creates poll [5min | 7min | 10min]
Bot: Waits for votes
Bot: Announces winning duration
```

### 2. Role Assignment Phase
```
Bot: Randomly selects imposter
Bot: Picks random secret word
Bot: DMs each player:
  - Normal: "Your word is: PIZZA"
  - Imposter: "You are the IMPOSTER"
Bot: "Roles assigned! @user will start..."
```

### 3. Discussion Phase
```
Bot: Starts countdown timer
Bot: [Players discuss the word]
Bot: "Time's up! Voting begins now."
```

### 4. Voting Phase
```
Bot: Creates poll with all player names
Bot: Waits for votes
Bot: Counts votes
Bot: Reveals results
```

### 5. Results
```
Bot: Shows imposter identity
Bot: Reveals secret word
Bot: Displays vote breakdown
Bot: Declares winner
```

## 🏗️ Project Structure

```
src/
├── index.ts                    # Main bot entry point
├── game/
│   ├── GameManager.ts          # Core game orchestration
│   ├── GameState.ts            # Game state types & utilities
│   └── WordList.ts             # Pool of secret words
├── handlers/
│   └── messageHandlers.ts      # Message routing & commands
├── helpers/
│   ├── client.ts               # XMTP client setup
│   └── utils.ts                # Utility functions
└── types/
    └── PollContent.ts          # Poll content type codec
```

## 🔧 Technical Details

### Architecture

Built on the [tba-chat-example-bot](https://github.com/xmtp/tba-chat-example-bot) architecture:

- **XMTP Node SDK** for messaging
- **Custom Poll Content Type** for voting
- **State Management** tracks multiple concurrent games
- **Timer System** manages discussion/voting phases
- **DM Support** for private role assignment

### Key Features

- ✅ Multi-group support (run games in multiple groups simultaneously)
- ✅ ENS/Basename resolution (human-readable names!)
- ✅ Automatic timer management
- ✅ Vote tracking and counting
- ✅ DM-based role assignment
- ✅ Error recovery and reconnection
- ✅ Graceful shutdown handling
- ✅ Mobile app compatible (Converse, Coinbase Wallet, Base app)

### Content Types

#### Poll Content Type
```typescript
{
  id: "poll-123",
  question: "Vote for duration",
  options: [
    { id: "5", label: "5 minutes" },
    { id: "7", label: "7 minutes" },
    { id: "10", label: "10 minutes" }
  ]
}
```

## 🎲 Game Mechanics

### Player Requirements
- Minimum 3 players to start
- All players must have XMTP enabled
- Works only in group chats (not DMs)

### Timing
- Duration voting: 60 seconds
- Discussion: 5, 7, or 10 minutes (voted by players)
- Voting phase: 60 seconds

### Word Selection
- 120+ secret words across categories:
  - Food & Drink
  - Animals
  - Technology
  - Nature
  - Sports & Games
  - And more!

## 🔒 Security & Privacy

- Bot wallet private key stored in `.env` (never commit!)
- XMTP database encrypted with encryption key
- Role assignments sent via private DMs
- No player data persisted after game ends

## 🐛 Troubleshooting

### Bot not responding
- Check bot is running with `yarn dev`
- Verify `.env` file exists with valid keys
- Ensure bot wallet has XMTP identity

### DMs not received
- Players must have XMTP enabled
- Check console logs for DM send errors
- Verify players aren't blocking bot

### Game stuck
- Use `/imposter cancel` to reset
- Restart bot if needed
- Check for timer issues in logs

## 🚂 Deployment

### Railway / Cloud Deployment

```bash
# Build the project
yarn build

# Set environment variables in your platform:
WALLET_KEY=0x...
ENCRYPTION_KEY=...
XMTP_ENV=production

# Start command
yarn start
```

## 🤝 Contributing

Based on the tba-chat-example-bot architecture. To add features:

1. **New commands**: Edit `handlers/messageHandlers.ts`
2. **Game mechanics**: Modify `game/GameManager.ts`
3. **New content types**: Add to `types/`
4. **More words**: Extend `game/WordList.ts`

## 📚 Documentation

- **[QUICKSTART.md](QUICKSTART.md)** - Get started in 5 minutes
- **[DEPLOYMENT.md](DEPLOYMENT.md)** - Deploy to Railway, Render, or Fly.io
- **[MOBILE_SETUP.md](MOBILE_SETUP.md)** - Use bot on mobile XMTP apps

## 📱 Mobile Apps

Works with any XMTP V3 app:
- [Converse](https://converse.xyz) - iOS/Android
- [Coinbase Wallet](https://coinbase.com/wallet) - iOS/Android
- [Base Mobile App](https://base.org) - Mobile
- [XMTP Web](https://xmtp.chat) - Browser

## 🔗 Resources

- [XMTP Documentation](https://docs.xmtp.org/)
- [XMTP Node SDK](https://github.com/xmtp/xmtp-node-js-tools)
- [TBA Chat Example](https://github.com/xmtp/tba-chat-example-bot)
- [ENS Domains](https://ens.domains)
- [Basenames](https://base.org/names)

## 📄 License

MIT License

---

Built with ❤️ using XMTP for decentralized group gaming 🎮

**Features:**
- 🎮 Social deduction gameplay
- 🏷️ ENS/Basename support
- 📱 Mobile-first design
- 🌍 Works globally on XMTP network
