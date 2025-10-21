const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Admin commands (Server Owner only)')
        .addSubcommand(subcommand =>
            subcommand
                .setName('givecurrency')
                .setDescription('Give currency to a user')
                .addStringOption(option =>
                    option.setName('currency')
                        .setDescription('Currency type')
                        .setRequired(true)
                        .addChoices(
                            { name: 'GP', value: 'gp' },
                            { name: 'eCoins', value: 'ecoins' }
                        ))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Amount to give')
                        .setRequired(true)
                        .setMinValue(1))
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to give currency to (optional)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('giftpenaltypack')
                .setDescription('Gift a free penalty minigame pack to a user')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to gift the pack to (optional)')))
        .addSubcommand(subcommand =>
            subcommand
                .setName('giftsplustrainer')
                .setDescription('Gift an S+ Trainer (+1,000,000 EXP) to a user via Mail')
                .addUserOption(option =>
                    option.setName('user')
                        .setDescription('User to gift the trainer to (optional)'))),
    async execute(interaction) {
        const { client } = interaction;
        // Only allow the BOT OWNER to use admin commands
        const botOwnerId = client.botOwnerId || process.env.BOT_OWNER_ID || null;
        if (!botOwnerId || interaction.user.id !== botOwnerId) {
            return await interaction.reply({ content: "⛔ You don't have access to this command.", ephemeral: true });
        }

        const subcommand = interaction.options.getSubcommand();

        if (subcommand === 'givecurrency') {
            await giveCurrency(interaction);
        } else if (subcommand === 'giftpenaltypack') {
            await giftPenaltyPack(interaction);
        } else if (subcommand === 'giftsplustrainer') {
            await giftSpluTrainer(interaction);
        }
    },
};

async function giveCurrency(interaction) {
    const { client } = interaction;
    const currencyType = interaction.options.getString('currency');
    const amount = interaction.options.getInteger('amount');
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const userData = client.getUserData(targetUser.id);

    if (currencyType === 'gp') {
        userData.gp += amount;
        await interaction.reply({ content: `Gave ${amount.toLocaleString()} GP to ${targetUser.username}.` });
    } else if (currencyType === 'ecoins') {
        userData.eCoins += amount;
        await interaction.reply({ content: `Gave ${amount.toLocaleString()} eCoins to ${targetUser.username}.` });
    }

    client.setUserData(targetUser.id, userData);
}

function todayKey() {
    const d = new Date();
    return d.toISOString().slice(0, 10);
}

async function giftPenaltyPack(interaction) {
    const { client } = interaction;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const userData = client.getUserData(targetUser.id);
    if (!userData.mail) userData.mail = [];

    const rarities = ['Iconic', 'Legend', 'Black'];
    const rarity = rarities[Math.floor(Math.random() * rarities.length)];

    userData.mail.push({
        id: Math.random().toString(36).slice(2, 10),
        type: 'pack',
        rarity,
        qty: 1,
        date: todayKey(),
    });

    client.setUserData(targetUser.id, userData);

    await interaction.reply({ content: `🎁 Gifted a free **${rarity} Pack** to ${targetUser.username}'s mail.` });
}

async function giftSpluTrainer(interaction) {
    const { client } = interaction;
    const targetUser = interaction.options.getUser('user') || interaction.user;

    const userData = client.getUserData(targetUser.id);
    if (!Array.isArray(userData.mail)) userData.mail = [];

    userData.mail.push({
        id: Math.random().toString(36).slice(2, 10),
        type: 'trainer',
        trainerName: 'S+ Trainer',
        exp: 1000000,
        date: todayKey(),
    });

    client.setUserData(targetUser.id, userData);

    await interaction.reply({ content: `🧑‍🏫 Gifted **S+ Trainer** (+1,000,000 EXP) to ${targetUser.username}'s mail.` });
}
