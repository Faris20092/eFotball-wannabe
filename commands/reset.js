const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Reset all your data (cannot be undone)'),
    async execute(interaction) {
        const { client } = interaction;

        const confirmButton = new ButtonBuilder()
            .setCustomId('confirm_reset')
            .setLabel('Yes, reset my data')
            .setStyle(ButtonStyle.Danger);

        const cancelButton = new ButtonBuilder()
            .setCustomId('cancel_reset')
            .setLabel('Cancel')
            .setStyle(ButtonStyle.Secondary);

        const row = new ActionRowBuilder().addComponents(confirmButton, cancelButton);

        const warningMessage = await interaction.reply({
            content: '⚠️ Are you sure you want to reset all your data? This action cannot be undone.',
            components: [row],
        });

        const filter = (buttonInteraction) => buttonInteraction.user.id === interaction.user.id;
        const collector = warningMessage.createMessageComponentCollector({ filter, time: 15000 });

        collector.on('collect', async (buttonInteraction) => {
            if (buttonInteraction.customId === 'confirm_reset') {
                // Create a new user profile, effectively resetting the data
                const newUser = {
                    id: interaction.user.id,
                    gp: 10000,
                    eCoins: 100,
                    players: [],
                    squad: { main: [], bench: [] },
                };
                client.setUserData(interaction.user.id, newUser);

                await buttonInteraction.update({ content: 'Your data has been reset.', components: [] });
            } else if (buttonInteraction.customId === 'cancel_reset') {
                await buttonInteraction.update({ content: 'Data reset has been cancelled.', components: [] });
            }
        });

        collector.on('end', (collected) => {
            if (collected.size === 0) {
                interaction.editReply({ content: 'Reset confirmation timed out.', components: [] });
            }
        });
    },
};
