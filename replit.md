# Overview

eFotball wannabe is a Discord bot with integrated web dashboard that simulates a football (soccer) management game. Users collect players through a gacha-style contract system, build squads with various formations, compete in matches against AI or other players, and manage their team through both Discord commands and a browser-based interface. The system features player progression through training, daily minigames (penalty shootouts), a mail/reward system, and news management for game updates.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Technologies

**Backend:**
- Node.js runtime
- Express.js web server
- Discord.js v14 for bot functionality
- Passport.js with Discord OAuth2 strategy for web authentication
- better-sqlite3 for session storage
- File-based JSON storage for game data

**Frontend:**
- Vanilla JavaScript (no frameworks)
- HTML/CSS with custom styling (eFotball-themed)
- Drag-and-drop API for squad builder
- Fetch API for backend communication

## Data Storage Architecture

**File-based JSON approach** chosen over traditional database:
- User data stored as individual JSON files (`data/{userId}.json`)
- Shared game data in root-level JSON files (`players.json`, `news.json`)
- Session data managed via SQLite (`sessions.db`) through express-session
- **Rationale:** Simplicity for small-scale deployment, easy debugging, no database setup required
- **Trade-off:** Not suitable for high-concurrency scenarios, manual file I/O management required

**Data Structure:**
- Each user has: GP currency, eCoins currency, player collection array, squad configuration (main/bench), mail inbox, minigame states, training inventory
- Squad references players by ID with formation-based position arrays
- Players have stats, rarity, level/exp progression, max level caps based on rarity

## Authentication Flow

**Discord OAuth2 Strategy:**
1. User clicks "Login with Discord" on landing page
2. Redirects to Discord OAuth2 authorization (`/auth/discord`)
3. Discord callback returns user profile (`/auth/discord/callback`)
4. Session created with user Discord ID and profile data
5. Passport serializes user to session store
6. Protected routes check `req.isAuthenticated()` middleware

**Session Management:**
- express-session with better-sqlite3 store for persistence
- Sessions survive server restarts
- Session secret from environment variable

## Discord Bot Architecture

**Command Handler Pattern:**
- Slash commands loaded dynamically from `/commands` directory
- Each command exports `data` (SlashCommandBuilder) and `execute` function
- Commands registered globally via `deploy-commands.js`
- Client maintains command collection in memory

**User Data Management:**
- Bot client has custom `getUserData()` and `setUserData()` methods
- Creates default user profile on first interaction
- Immediate file writes on data changes (no caching layer)

**Interaction Handling:**
- Button interactions for pagination, confirmations (reset, mail claim)
- Autocomplete for player/pack selection
- Cooldown system using in-memory Map for match commands

## Web Dashboard Architecture

**Multi-Page Application:**
- Separate HTML files for each view (dashboard, my-team, contracts, mail, news)
- Each page has dedicated JavaScript file for client-side logic
- Shared CSS stylesheet (`styles.css`) with CSS variables for theming

**API Endpoints:**
- `/api/user` - Returns authenticated user's Discord profile + game data
- `/api/players` - Returns all available players from `players.json`
- `/api/squad` - GET/POST for viewing/updating squad configuration
- `/api/mail` - GET for viewing mail, POST for claiming rewards
- `/api/news` - Returns news articles
- `/api/contracts/info` - Returns pack definitions and rates
- `/api/contracts/open` - Processes pack opening (deducts currency, adds player)

**State Management:**
- Client-side JavaScript maintains global state variables
- Fetches fresh data on page load
- Optimistic UI updates followed by server saves
- No state management library - manual synchronization

## Squad Builder Implementation

**Drag-and-Drop System:**
- HTML5 Drag and Drop API
- Draggable player cards from available list
- Drop zones on pitch positions and bench
- Duplicate detection prevents same player in multiple positions
- Auto-cleanup function removes duplicates on squad load
- Swap functionality when dropping on occupied position

**Formation System:**
- Predefined formation configurations (4-3-3, 4-4-2, 3-5-2, 4-2-3-1)
- Each formation maps to position array (e.g., ['GK', 'LB', 'CB', ...])
- Visual pitch rendering with CSS Grid/Flexbox
- Position filtering ensures only compatible players shown for each slot

## Player Gacha System

**Pack Types:**
- Iconic Pack (500 eCoins) - Highest rarity rates
- Legend Pack (25,000 GP) - Mid-tier rates
- Standard Pack (10,000 GP) - Common rates
- Each pack has defined rarity probability distribution

**Pull Mechanics:**
- Weighted random selection based on pack's rarity chances
- Single pull (`/contract`) and multi-pull (`/contract2`, max 10)
- Deduplication: Players with same ID can be owned multiple times
- Visual feedback with rarity-colored embeds and GIF animations (optional)

## Match Simulation

**AI Opponents:**
- Predefined list of real-world club teams with strength ratings
- Random team selection for each match
- Win probability calculated from team strength differential

**PvP Matchmaking:**
- Queue system using in-memory Map
- 15-second timeout for finding opponent
- Falls back to AI match if no opponent found
- Active match tracking prevents concurrent matches per user

**Reward System:**
- Different reward tiers for PvP vs AI matches
- Win/Draw/Loss outcomes with corresponding GP and eCoin rewards
- Cooldown system (30s for PvP, 30s for regular match)

## Training System

**Experience-Based Progression:**
- Players gain EXP through trainer items
- Level caps based on rarity (White: 20, Iconic: 50)
- Stat growth weighted by position priorities
- Overall rating recalculated after stat changes

**Trainer Types:**
- Normal, Basic, Advanced, Elite, S, S+ trainers with increasing EXP values
- Shop system for purchasing trainers with GP/eCoins
- Player-to-trainer conversion (duplicate management strategy)

## News/Mail System

**News Management:**
- Admin-only commands (`/managenews`) for adding/removing news
- Categories: Update, Issue, Event, Maintenance, Announcement
- Pagination system for viewing news (5 per page)
- Date-sorted display (newest first)

**Mail/Reward Inbox:**
- Asynchronous reward delivery system
- Mail items: GP, eCoins, Packs, Trainers
- "Claim All" functionality processes all unclaimed items
- Daily penalty minigame rewards delivered via mail

## Asset Management

**Player Face Images:**
- Local storage in `/assets/faces/` directory
- Naming convention: `{player_name}.png` or `.jpg`
- Fallback to `default_player.png` if player face not found
- Static file serving for `/assets` directory

**Visual Design:**
- FIFA/eFootball-inspired card design
- Rarity-based color schemes (Iconic: rainbow, Legend: gold, etc.)
- Circular player portraits with rarity-colored borders
- Position and rating badges on cards

## Deployment Architecture

**Keep-Alive Mechanism:**
- Optional healthcheck pings to external service (e.g., UptimeRobot)
- Environment variable `HEALTHCHECK_URL` for configuration
- 5-minute ping interval to prevent free-tier sleeping

**Process Management:**
- `web-server.js` spawns Discord bot as child process
- Bot auto-restarts on crash (5-second delay)
- Single entry point for deployment platforms (Render.com recommended)

**Environment Configuration:**
- `.env` file for sensitive credentials
- Required variables: `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `SESSION_SECRET`
- Optional: `CALLBACK_URL`, `HEALTHCHECK_URL`, `BOT_OWNER_ID`, `ADMIN_IDS`

# External Dependencies

**Discord Integration:**
- Discord Bot API (via discord.js)
- Discord OAuth2 for web authentication
- Requires bot token and OAuth2 credentials from Discord Developer Portal

**Third-Party Services:**
- Optional: UptimeRobot or similar for healthcheck pings (keep-alive on free hosting)

**NPM Packages:**
- `discord.js` - Discord bot framework
- `express` - Web server
- `passport` & `passport-discord` - OAuth2 authentication
- `express-session` & `express-session-better-sqlite3` - Session management
- `better-sqlite3` - SQLite database for sessions
- `@faker-js/faker` - Player name generation (used in scripts)
- `dotenv` - Environment variable management
- `body-parser` & `cookie-parser` - Express middleware

**No External Database:**
- All game data stored in local JSON files
- SQLite only used for session persistence
- No PostgreSQL, MySQL, or MongoDB required