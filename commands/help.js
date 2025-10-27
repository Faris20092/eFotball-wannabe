const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('help')
        .setDescription('Displays a list of all available commands.'),
    async execute(interaction) {
        const helpEmbed = new EmbedBuilder()
            .setTitle('eFotbal wannabe — Commands')
            .setDescription('Quick reference for available commands:')
            .setColor('#0099ff')
            .addFields(
                { name: 'Core', value: [
                    '`/profile` — View your profile and balances',
                    '`/collection` — Browse your players with filters and pages',
                    '`/leaderboard` — View rankings',
                    '`/news [page:<n>]` — View latest game updates and news',
                    '`/help` — Show this help message'
                ].join('\n') },
                { name: 'Contract', value: [
                    '`/contract-info` — View pack rates and info',
                    '`/contract pack:<iconic|legend|standard>` — Pull 1 player',
                    '`/contract2 pack:<iconic|legend|standard> count:<1-10>` — Multi-pull up to 10 players'
                ].join('\n') },
                { name: 'Squad Management', value: [
                    '`/squad view` — View your current squad',
                    '`/squad autoset` — Auto-pick the best XI and bench',
                    '`/squad set position:<1-11> player:<name>` — Set a player in your XI',
                    '`/squad remove position:<1-11>` — Remove player from XI',
                    '`/squad formation formation:<4-3-3|4-4-2|3-5-2|4-2-3-1>` — Change formation',
                    '`/squad bench action:<add|remove> player:<name>` — Manage bench'
                ].join('\n') },
                { name: 'Player Management', value: [
                    '`/removeplayer player:<name>` — Remove a player from your collection',
                    '`/addplayer player:<name> [user:<@user>]` — [ADMIN] Add any player to a user\'s team'
                ].join('\n') },
                { name: 'Matches', value: [
                    '`/match` — Play a match vs AI for rewards',
                    '`/pvp` — Search for opponent (falls back to AI if no players found)'
                ].join('\n') },
                { name: 'Training', value: [
                    '`/training player player:<name> trainer:<type> amount:<n>` — Train a player',
                    '`/training convert player:<name>` — Convert player to Training EXP item',
                    '`/training info [player:<name>]` — Show training info or center',
                    '`/training shop` — View training shop'
                ].join('\n') },
                { name: 'Daily & Rewards', value: [
                    '`/penalty status` — View daily penalty progress',
                    '`/penalty shoot` — Take your daily penalty shot',
                    '`/mail` — View rewards and Claim All',
                    '`/use pack:<Iconic|Legend|Black>` — Open a free pack from inventory'
                ].join('\n') },
                { name: 'Account', value: [
                    '`/reset` — Reset your account (confirmation required)'
                ].join('\n') }
            )
            .setFooter({ text: 'eFotbal wannabe | Have fun!' });

        await interaction.reply({ embeds: [helpEmbed] });
    },
};
