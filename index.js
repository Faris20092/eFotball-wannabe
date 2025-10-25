require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require('discord.js');
const config = require('./config.json');

// --- Healthcheck Setup (Keep Bot Alive) ---
const HEALTHCHECK_URL = process.env.HEALTHCHECK_URL;

// Function to send the "I'm alive!" signal
function sendHealthcheck() {
    if (HEALTHCHECK_URL) {
        // Use fetch (built into Node.js 18+)
        fetch(HEALTHCHECK_URL)
            .then(res => console.log('✅ Healthcheck sent successfully:', res.status))
            .catch(err => console.error('❌ Healthcheck failed:', err));
    } else {
        console.warn("⚠️ HEALTHCHECK_URL not set. Skipping health check.");
    }
}

// Ping every 25 minutes (just under the 30-minute period)
const PING_INTERVAL_MS = 5 * 60 * 1000;

// Start the interval timer
setInterval(sendHealthcheck, PING_INTERVAL_MS);

// Run the first check immediately
sendHealthcheck();

// --- Discord Bot Setup ---
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
    ]
});

// --- Command Handler ---
client.commands = new Collection();
const commandFiles = fs.readdirSync(path.join(__dirname, 'commands')).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(__dirname, 'commands', file));
    client.commands.set(command.data.name, command);
}

// --- User Data Management ---
const dataPath = path.join(__dirname, 'data');
if (!fs.existsSync(dataPath)) {
    fs.mkdirSync(dataPath);
}

client.getUserData = (userId) => {
    const userFile = path.join(dataPath, `${userId}.json`);
    if (fs.existsSync(userFile)) {
        const data = JSON.parse(fs.readFileSync(userFile));
        // Backfill new fields
        if (!data.players) data.players = [];
        if (!data.squad) data.squad = { main: [], bench: [] };
        if (!data.mail) data.mail = [];
        if (!data.inventory) data.inventory = { freePacks: { Iconic: 0, Legend: 0, Black: 0 } };
        if (!data.inventory.freePacks) data.inventory.freePacks = { Iconic: 0, Legend: 0, Black: 0 };
        if (!data.minigames) data.minigames = {};
        if (!data.daily) data.daily = { lastClaim: '' };
        return data;
    } else {
        // Create a new user profile
        const newUser = {
            id: userId,
            gp: 10000, // Starting GP
            eCoins: 100, // Starting eCoins
            players: [],
            squad: { main: [], bench: [] },
            mail: [],
            inventory: { freePacks: { Iconic: 0, Legend: 0, Black: 0 } },
            minigames: {},
            daily: { lastClaim: '' },
        };
        fs.writeFileSync(userFile, JSON.stringify(newUser, null, 2));
        return newUser;
    }
};

client.setUserData = (userId, data) => {
    const userFile = path.join(dataPath, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
};

// List all known user IDs from the data directory
client.listAllUserIds = () => {
    try {
        return fs.readdirSync(dataPath)
            .filter(f => f.endsWith('.json'))
            .map(f => path.basename(f, '.json'));
    } catch (e) {
        return [];
    }
};

// --- Helpers ---
function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

// --- Bot Events ---
client.once('clientReady', async () => {
    // Fetch application to determine bot owner (for owner-only commands)
    try {
        await client.application.fetch();
        client.botOwnerId = client.application?.owner?.id || process.env.BOT_OWNER_ID || null;
    } catch (e) {
        client.botOwnerId = process.env.BOT_OWNER_ID || null;
    }
    console.log(`Logged in as ${client.user.tag}! Bot is ready.`);
});

client.on('interactionCreate', async interaction => {
    try {
        // Handle button interactions for /collection pagination
        if (interaction.isButton()) {
            if (interaction.customId && interaction.customId.startsWith('collection:')) {
                const collectionCmd = client.commands.get('collection');
                if (collectionCmd && typeof collectionCmd.handleButton === 'function') {
                    return await collectionCmd.handleButton(interaction);
                }
            }
            if (interaction.customId && interaction.customId.startsWith('mail:')) {
                const mailCmd = client.commands.get('mail');
                if (mailCmd && typeof mailCmd.handleButton === 'function') {
                    return await mailCmd.handleButton(interaction);
                }
            }
            if (interaction.customId && interaction.customId.startsWith('penalty_')) {
                const penaltyCmd = client.commands.get('penalty');
                if (penaltyCmd && typeof penaltyCmd.handleButton === 'function') {
                    return await penaltyCmd.handleButton(interaction);
                }
            }
            if (interaction.customId && interaction.customId.startsWith('shoot_')) {
                const matchCmd = client.commands.get('match');
                if (matchCmd && typeof matchCmd.handleButton === 'function') {
                    return await matchCmd.handleButton(interaction, client);
                }
            }
            if (interaction.customId && interaction.customId.startsWith('pvpshoot_')) {
                const pvpCmd = client.commands.get('pvp');
                if (pvpCmd && typeof pvpCmd.handleButton === 'function') {
                    return await pvpCmd.handleButton(interaction, client);
                }
            }
            if (interaction.customId && interaction.customId.startsWith('leaderboard_')) {
                const leaderboardCmd = client.commands.get('leaderboard');
                if (leaderboardCmd && typeof leaderboardCmd.handleButton === 'function') {
                    return await leaderboardCmd.handleButton(interaction);
                }
            }
            return; // ignore other buttons
        }

        // Autocomplete routing
        if (interaction.isAutocomplete()) {
            const command = client.commands.get(interaction.commandName);
            if (command && typeof command.autocomplete === 'function') {
                return await command.autocomplete(interaction);
            }
            return;
        }

        if (!interaction.isChatInputCommand()) return;

        const command = client.commands.get(interaction.commandName);

        if (!command) {
            console.error(`No command matching ${interaction.commandName} was found.`);
            return;
        }

        await command.execute(interaction);

        // Auto-claim daily reward once per day (after any successful command)
        try {
            const userId = interaction.user.id;
            const userData = client.getUserData(userId);
            const today = todayKey();
            if (!userData.daily) userData.daily = { lastClaim: '' };
            if (userData.daily.lastClaim !== today) {
                // Grant daily reward
                const dailyReward = { gp: 2000, eCoins: 5 };
                userData.gp = (userData.gp || 0) + dailyReward.gp;
                userData.eCoins = (userData.eCoins || 0) + dailyReward.eCoins;
                userData.daily.lastClaim = today;
                client.setUserData(userId, userData);

                const embed = new EmbedBuilder()
                    .setTitle('🗓️ Daily Reward Claimed!')
                    .setColor('#27ae60')
                    .setDescription(`Thanks for playing today! Here are your daily rewards:`)
                    .addFields(
                        { name: 'GP', value: `+${dailyReward.gp.toLocaleString()}`, inline: true },
                        { name: 'eCoins', value: `+${dailyReward.eCoins}`, inline: true },
                    )
                    .setFooter({ text: 'Come back tomorrow for more!' });

                // Send as a separate message so it appears alongside the command result
                await interaction.followUp({ embeds: [embed] });
            }
        } catch (e) {
            // Don't let daily errors break commands
            console.error('daily reward error:', e);
        }
    } catch (error) {
        console.error(error);
        try {
            if (interaction.replied || interaction.deferred) {
                await interaction.followUp({ content: 'There was an error while executing this command!', ephemeral: true });
            } else {
                await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
            }
        } catch {}
    }
});

client.login(process.env.DISCORD_TOKEN);
