const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

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
        .setName('removeplayer')
        .setDescription('Remove a player from your collection')
        .addStringOption(option =>
            option.setName('player')
                .setDescription('Player name to search for')
                .setRequired(true)
                .setAutocomplete(true)),

    async autocomplete(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);
        
        if (!userData.players || userData.players.length === 0) {
            return await interaction.respond([]);
        }

        const focusedValue = interaction.options.getFocused().toLowerCase();
        
        // Filter user's owned players by name
        const filtered = userData.players
            .filter(player => player.name.toLowerCase().includes(focusedValue))
            .slice(0, 25) // Discord limit
            .map(player => ({
                name: `${player.name} (${player.rarity} - ${player.position} - ${player.overall} OVR)`,
                value: player.id
            }));

        await interaction.respond(filtered);
    },

    async execute(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);

        if (!userData.players || userData.players.length === 0) {
            return await interaction.reply({ 
                content: '❌ You don\'t have any players in your collection.', 
                ephemeral: true 
            });
        }

        const playerId = interaction.options.getString('player');

        // Find the player in user's collection
        const playerIndex = userData.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) {
            return await interaction.reply({ 
                content: '❌ You don\'t own this player.', 
                ephemeral: true 
            });
        }

        // Get player data before removing
        const removedPlayer = userData.players[playerIndex];

        // Remove player from collection
        userData.players.splice(playerIndex, 1);
        client.setUserData(interaction.user.id, userData);

        // Create success embed
        const rarityEmoji = RARITY_EMOJIS[removedPlayer.rarity] || '⚽';
        const embed = new EmbedBuilder()
            .setTitle(`🗑️ Player Removed`)
            .setDescription(`**${removedPlayer.name}** has been removed from your collection.`)
            .setColor(RARITY_COLORS[removedPlayer.rarity] || '#0099ff')
            .addFields(
                { name: 'Rarity', value: `${rarityEmoji} ${removedPlayer.rarity}`, inline: true },
                { name: 'Overall', value: `📊 ${removedPlayer.overall}`, inline: true },
                { name: 'Position', value: `🎯 ${removedPlayer.position}`, inline: true }
            )
            .setFooter({ text: `Players remaining: ${userData.players.length}` })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    },
};
