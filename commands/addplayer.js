const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const players = require('../players.json');
const config = require('../config.json');

const RARITY_EMOJIS = {
    'Iconic': '💎',
    'Legend': '🌟',
    'Black': '⚫',
    'Gold': '🟡',
    'Silver': '⚪',
    'Bronze': '🟤',
    'White': '⬜',
};

const RARITY_COLORS = {
    'Iconic': '#FF00FF',
    'Legend': '#FFD700',
    'Black': '#000000',
    'Gold': '#FFC300',
    'Silver': '#C0C0C0',
    'Bronze': '#CD7F32',
    'White': '#FFFFFF',
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('addplayer')
        .setDescription('[ADMIN] Add any player to a user\'s team')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Player name to search for')
                .setRequired(true)
                .setAutocomplete(true))
        .addUserOption(option =>
            option.setName('user')
                .setDescription('User to add the player to (leave empty for yourself)')
                .setRequired(false)),

    async autocomplete(interaction) {
        try {
            const focusedValue = interaction.options.getFocused().toLowerCase();
            
            // Filter players by name
            const filtered = players
                .filter(player => player.name && player.name.toLowerCase().includes(focusedValue))
                .slice(0, 25) // Discord limit
                .map(player => ({
                    name: `${player.name} (${player.rarity} - ${player.position} - ${player.overall} OVR)`,
                    value: player.id
                }));

            await interaction.respond(filtered.length > 0 ? filtered : [{ name: 'No players found', value: 'none' }]);
        } catch (error) {
            console.error('Autocomplete error in addplayer:', error);
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const { client } = interaction;

        // Check if user is admin
        const adminIds = config.adminIds || [];
        if (!adminIds.includes(interaction.user.id)) {
            return await interaction.reply({ 
                content: '❌ You do not have permission to use this command. Only admins can add players.', 
                ephemeral: true 
            });
        }

        const playerId = interaction.options.getString('player');
        const targetUser = interaction.options.getUser('user') || interaction.user;

        // Check for placeholder values
        if (playerId === 'none' || playerId === 'error') {
            return await interaction.reply({ 
                content: '❌ Please select a valid player from the autocomplete list.', 
                ephemeral: true 
            });
        }

        // Find the player
        const player = players.find(p => p.id === playerId);
        if (!player) {
            return await interaction.reply({ 
                content: '❌ Player not found. Please use the autocomplete search.', 
                ephemeral: true 
            });
        }

        // Get user data
        const userData = client.getUserData(targetUser.id);
        if (!userData.players) userData.players = [];

        // Check if player already exists
        const alreadyOwned = userData.players.some(p => p.id === player.id);
        if (alreadyOwned) {
            return await interaction.reply({ 
                content: `❌ ${targetUser.username} already owns **${player.name}**.`, 
                ephemeral: true 
            });
        }

        // Add player to user's collection
        userData.players.push(player);
        client.setUserData(targetUser.id, userData);

        // Create success embed
        const rarityEmoji = RARITY_EMOJIS[player.rarity] || '⚽';
        const embed = new EmbedBuilder()
            .setTitle(`${rarityEmoji} Player Added! ${rarityEmoji}`)
            .setDescription(`**${player.name}** has been added to ${targetUser.username}'s collection!`)
            .setColor(RARITY_COLORS[player.rarity] || '#0099ff')
            .addFields(
                { name: 'Rarity', value: `${rarityEmoji} ${player.rarity}`, inline: true },
                { name: 'Overall', value: `📊 ${player.overall}`, inline: true },
                { name: 'Position', value: `🎯 ${player.position}`, inline: true }
            )
            .setFooter({ text: `Admin: ${interaction.user.username}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
