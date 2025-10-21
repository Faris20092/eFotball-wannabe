const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const players = require('../players.json');
const config = require('../config.json');

// --- Contract Configuration ---

const PACKS = {
    'iconic': {
        name: 'Iconic Moment Pack',
        cost: 500,
        currency: 'eCoins',
        description: 'A special pack containing players of all rarities, with a chance to get an Iconic Moment player!',
        rarity_chances: {
            'Iconic': 0.01,
            'Legend': 0.03,
            'Black': 0.10,
            'Gold': 0.20,
            'Silver': 0.30,
            'Bronze': 0.26,
            'White': 0.10,
        }
    },
    'legend': {
        name: 'Legend Box Draw',
        cost: 25000,
        currency: 'GP',
        description: 'A box draw with a chance to get a Legend player!',
        rarity_chances: {
            'Legend': 0.05,
            'Black': 0.15,
            'Gold': 0.25,
            'Silver': 0.35,
            'Bronze': 0.20,
            'White': 0.00, // No white balls in this pack
        }
    },
    'standard': {
        name: 'Standard Pack',
        cost: 10000,
        currency: 'GP',
        description: 'A standard pack containing players from Black to White rarity.',
        rarity_chances: {
            'Black': 0.05,
            'Gold': 0.20,
            'Silver': 0.40,
            'Bronze': 0.25,
            'White': 0.10,
        }
    }
};

const RARITY_SELL_VALUE = {
    'Iconic': 50000,
    'Legend': 25000,
    'Black': 10000,
    'Gold': 5000,
    'Silver': 2500,
    'Bronze': 1000,
    'White': 500,
};

const RARITY_COLORS = {
    'Iconic': '#FF00FF', // Magenta
    'Legend': '#FFD700', // Gold
    'Black': '#000000',
    'Gold': '#FFC300',
    'Silver': '#C0C0C0',
    'Bronze': '#CD7F32',
    'White': '#FFFFFF',
};

// --- Emoji mappings (presentation only, logic unchanged) ---
const RARITY_EMOJIS = {
    'Iconic': '💎',
    'Legend': '🌟',
    'Black': '⚫',
    'Gold': '🟡',
    'Silver': '⚪',
    'Bronze': '🟤',
    'White': '⬜',
};

const PACK_EMOJIS = {
    'iconic': '💎',
    'legend': '🏆',
    'standard': '📦',
};

// --- Helper Functions ---

function selectRarity(chances) {
    const rand = Math.random();
    let cumulative = 0;
    for (const rarity in chances) {
        cumulative += chances[rarity];
        if (rand < cumulative) {
            return rarity;
        }
    }
    return Object.keys(chances)[Object.keys(chances).length - 1]; // Fallback
}

function pullPlayer(rarity) {
    const filteredPlayers = players.filter(p => p.rarity === rarity);
    if (filteredPlayers.length === 0) return null;
    return filteredPlayers[Math.floor(Math.random() * filteredPlayers.length)];
}

function getRarityGif(rarity) {
    // Prefer local assets/gifs/<rarity>.gif (lowercased), fallback to config.contractGifs[rarity]
    const lower = String(rarity || '').toLowerCase();
    const filename = `${lower}.gif`;
    const filePath = path.join(__dirname, '..', 'assets', 'gifs', filename);
    if (fs.existsSync(filePath)) {
        return { type: 'attachment', filename, filePath };
    }
    const url = config?.contractGifs?.[rarity] || config?.gachaGifs?.[rarity];
    if (url) return { type: 'url', url };
    return null;
}

// --- Command Definition ---

module.exports = {
    data: new SlashCommandBuilder()
        .setName('contract')
        .setDescription('Use the contract system to pull new players')
        .addStringOption(option =>
            option.setName('pack')
                .setDescription('Choose a contract pack')
                .addChoices(
                    { name: 'Iconic Moment Pack (500 eCoins)', value: 'iconic' },
                    { name: 'Legend Box Draw (25,000 GP)', value: 'legend' },
                    { name: 'Standard Pack (10,000 GP)', value: 'standard' }
                )),
    async execute(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);

        const packName = interaction.options.getString('pack');

        if (!packName) {
            const helpEmbed = new EmbedBuilder()
                .setTitle('eFutbal Contract System')
                .setDescription('Choose a pack to pull from using the pack option.')
                .setColor('#0099ff');

            for (const packKey in PACKS) {
                const pack = PACKS[packKey];
                const emoji = PACK_EMOJIS[packKey] || '';
                helpEmbed.addFields({ name: `${emoji} ${pack.name}`, value: `${pack.description}\nCost: **${pack.cost} ${pack.currency}**` });
            }

            return await interaction.reply({ embeds: [helpEmbed] });
        }

        const pack = PACKS[packName];

        if (!pack) {
            return await interaction.reply({ content: 'That pack does not exist.', ephemeral: true });
        }

        // Ensure userData.players exists (presentation-only safeguard)
        if (!userData.players) userData.players = [];

        // Check currency
        if (pack.currency === 'GP' && userData.gp < pack.cost) {
            return await interaction.reply({ content: `You don't have enough GP! You need ${pack.cost} GP.`, ephemeral: true });
        } else if (pack.currency === 'eCoins' && userData.eCoins < pack.cost) {
            return await interaction.reply({ content: `You don't have enough eCoins! You need ${pack.cost} eCoins.`, ephemeral: true });
        }

        // Defer reply to avoid interaction timeout while we process
        await interaction.deferReply();

        // Deduct currency
        if (pack.currency === 'GP') {
            userData.gp -= pack.cost;
        } else {
            userData.eCoins -= pack.cost;
        }

        // Pull the player
        const targetRarity = selectRarity(pack.rarity_chances);
        const newPlayer = pullPlayer(targetRarity);

        if (!newPlayer) {
            // This should ideally not happen if players.json is populated correctly
            // NOTE: Keeping original behavior (don't change logic) — use editReply because we already deferred
            return await interaction.editReply({ content: 'Could not find a player for the determined rarity. Please contact an admin.' });
        }

        // Check for duplicates
        const isDuplicate = userData.players.some(p => p.id === newPlayer.id);
        let footerText = '';

        if (isDuplicate) {
            const sellValue = RARITY_SELL_VALUE[newPlayer.rarity] || 500;
            userData.gp += sellValue;
            footerText = `Duplicate! You received ${sellValue} GP for selling the extra copy.`;
        } else {
            userData.players.push(newPlayer);
            footerText = 'New player added to your collection!';
        }

        client.setUserData(interaction.user.id, userData);

        // Send result embed (beautified only)
        const rarityEmoji = RARITY_EMOJIS[newPlayer.rarity] || '';
        const resultEmbed = new EmbedBuilder()
            .setTitle(`${rarityEmoji} Contract Pull! ${rarityEmoji}`)
            .setDescription(`You pulled **${newPlayer.name}**!`)
            .setColor(RARITY_COLORS[newPlayer.rarity] || '#0099ff')
            .addFields(
                { name: 'Rarity', value: `${rarityEmoji} ${newPlayer.rarity}`, inline: true },
                { name: 'Overall', value: `📊 ${String(newPlayer.overall)}`, inline: true },
                { name: 'Position', value: `🎯 ${newPlayer.position}`, inline: true }
            )
            .setFooter({ text: footerText });

        // Attach rarity gif if available
        const gif = getRarityGif(newPlayer.rarity);
        if (gif) {
            if (gif.type === 'attachment') {
                resultEmbed.setImage(`attachment://${gif.filename}`);
                return await interaction.editReply({ embeds: [resultEmbed], files: [gif.filePath] });
            }
            if (gif.type === 'url') {
                resultEmbed.setImage(gif.url);
            }
        }

        await interaction.editReply({ embeds: [resultEmbed] });
    },
};
