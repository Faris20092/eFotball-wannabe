const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('View your eFotbal profile and currencies'),
    async execute(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);

        const profileEmbed = new EmbedBuilder()
            .setTitle(`${interaction.user.username}'s eFotbal Profile`)
            .setColor('#0099ff')
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields(
                { name: 'GP (General Points)', value: `💰 ${userData.gp.toLocaleString()}`, inline: true },
                { name: 'eCoins', value: `🪙 ${userData.eCoins.toLocaleString()}`, inline: true },
                { name: 'Players Owned', value: `👥 ${userData.players.length}`, inline: true }
            );

        // Player collection moved to /collection
        profileEmbed.addFields({ name: 'Commands', value: 'Use `/collection` to view your players.' });

        await interaction.reply({ embeds: [profileEmbed] });
    },
};
