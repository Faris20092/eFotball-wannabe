# eFotbal wannabe - Discord Bot

An eFootball-inspired Discord bot with contract mechanics, squad management, and match simulation.

## Features

- **Contract System**: Pull players from different packs with varying rarities
- **Player Collection**: Collect 900+ unique players with detailed stats
- **Squad Management**: Build your team with formations and bench players
- **Match Simulation**: Play against AI teams and earn rewards
- **Currency System**: Manage GP and eCoins
- **User Profiles**: Track your progress and collection
- **Admin Commands**: Server management tools

## Setup

### Prerequisites

- Node.js (v16 or higher)
- A Discord Bot Token

### Installation

1. Clone or download this project
2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a Discord Application:
   - Go to [Discord Developer Portal](https://discord.com/developers/applications)
   - Create a new application
   - Go to "Bot" section and create a bot
   - Copy the bot token

4. Configure the bot:
   - Open `.env` file
   - Add your bot token: `DISCORD_TOKEN=your_bot_token_here`

5. Invite the bot to your server:
   - In Discord Developer Portal, go to OAuth2 > URL Generator
   - Select "bot" scope and necessary permissions
   - Use the generated URL to invite the bot

6. Start the bot:
   ```bash
   node index.js
   ```

## Commands

### Basic Commands

- `!profile` - View your profile, currency, and player collection
- `!contract` - View available contract packs
- `!contract <pack_name>` - Pull from a specific pack
- `!squad` - View your current squad
- `!match` - Simulate a match against AI

### Contract Packs

- `!contract iconic` - Iconic Moment Pack (500 eCoins)
- `!contract legend` - Legend Box Draw (25,000 GP)
- `!contract standard` - Standard Pack (10,000 GP) - Black to White rarity

### Squad Management

- `!squad set <position> <player_name>` - Set a player in your main squad
- `!squad remove <position>` - Remove a player from position
- `!squad formation <formation>` - Change formation (4-3-3, 4-4-2, 3-5-2, 4-2-3-1)
- `!squad bench add <player_name>` - Add player to bench
- `!squad bench remove <player_name>` - Remove player from bench

### Admin Commands (Server Owner Only)

- `!admin givecurrency <gp|ecoins> <amount> [user]` - Give currency to a user
- `!reset` - Reset your own data (with confirmation)

## Player Rarities

From highest to lowest:
- **Iconic** (Magenta) - 95-100 overall
- **Legend** (Gold) - 90-94 overall  
- **Black** - 85-89 overall
- **Gold** - 80-84 overall
- **Silver** - 75-79 overall
- **Bronze** - 70-74 overall
- **White** - 60-69 overall

## Currency

- **GP (General Points)**: Primary currency for most packs and activities
- **eCoins**: Premium currency for special packs

Starting amounts:
- 10,000 GP
- 100 eCoins

## Match Rewards

- **Win**: 5,000 GP + 10 eCoins
- **Draw**: 2,000 GP + 5 eCoins
- **Loss**: 1,000 GP + 2 eCoins

## File Structure

```
eFotbal-wannabe/
├── commands/           # Bot commands
│   ├── admin.js       # Admin commands
│   ├── contract.js    # Contract system
│   ├── contract2.js   # Contract multi-pull system
│   ├── contract-info.js # Contract pack info
│   ├── match.js       # Match simulation
│   ├── profile.js     # User profiles
│   ├── reset.js       # Data reset
│   └── squad.js       # Squad management
├── data/              # User data storage
├── scripts/           # Utility scripts
│   └── generate-players.js
├── .env              # Environment variables
├── config.json       # Bot configuration
├── index.js          # Main bot file
├── package.json      # Dependencies
├── players.json      # Player database
└── README.md         # This file
```

## Troubleshooting

### Bot doesn't respond
- Check if the bot token is correct in `.env`
- Ensure the bot has necessary permissions in your Discord server
- Check the console for error messages

### Commands not working
- Make sure you're using the correct prefix (`!`)
- Check if the bot is online and has read/send message permissions

### Player data issues
- If players.json is empty, run: `node scripts/generate-players.js`

## Support

If you encounter any issues or have questions, please check the console logs for error messages. The bot logs important information that can help diagnose problems.

## License

This project is for educational and entertainment purposes.
