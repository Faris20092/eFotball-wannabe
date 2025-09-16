const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mail')
    .setDescription('View your free items and rewards'),

  async execute(interaction) {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);

    const packs = (userData.inventory && userData.inventory.freePacks) || { Iconic: 0, Legend: 0, Black: 0 };
    const mail = Array.isArray(userData.mail) ? userData.mail : [];

    const lines = [
      `Iconic Packs: ${packs.Iconic || 0}`,
      `Legend Packs: ${packs.Legend || 0}`,
      `Black Packs: ${packs.Black || 0}`,
    ];

    const mailLines = mail.length ? mail.map(m => {
        if (m.type === 'pack') {
          return `• [${m.date}] ${m.rarity} Pack x${m.qty || 1}`;
        } else if (m.type === 'eCoins') {
          return `• [${m.date}] ${m.amount} eCoins`;
        } else if (m.type === 'gp') {
          return `• [${m.date}] ${m.amount.toLocaleString()} GP`;
        } else if (m.type === 'trainer') {
          const label = m.trainerName || 'Trainer';
          const exp = m.exp || 0;
          return `• [${m.date}] ${label} (+${exp.toLocaleString()} EXP)`;
        } else {
          return `• [${m.date}] ${m.type}: ${m.amount || 'Unknown'}`;
        }
      }) : ['No mail items.'];

    const embed = new EmbedBuilder()
      .setTitle(`${interaction.user.username}'s Mail & Free Items`)
      .setColor('#8e44ad')
      .addFields(
        { name: 'Free Packs', value: lines.join('\n'), inline: true },
        { name: 'Mail', value: mailLines.slice(0, 10).join('\n'), inline: false }
      )
      .setFooter({ text: 'Use /use to open a free pack.' });

    const components = [];
    if (mail.length > 0) {
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('mail:claimall').setStyle(ButtonStyle.Primary).setLabel('Claim All')
      );
      components.push(row);
    }

    await interaction.reply({ embeds: [embed], components, ephemeral: true });
  },

  // Placeholder to allow future mail actions (claim buttons, etc.)
  async handleButton(interaction) {
    if (!interaction.customId.startsWith('mail:')) return;
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);
    const mail = Array.isArray(userData.mail) ? userData.mail : [];

    if (interaction.customId === 'mail:claimall') {
      if (mail.length === 0) {
        return interaction.reply({ content: 'No mail to claim.', ephemeral: true });
      }

      // Ensure inventory exists
      if (!userData.inventory) userData.inventory = { freePacks: { Iconic: 0, Legend: 0, Black: 0 } };
      if (!userData.inventory.freePacks) userData.inventory.freePacks = { Iconic: 0, Legend: 0, Black: 0 };
      if (!Array.isArray(userData.playerTrainers)) userData.playerTrainers = [];

      let coinsAdded = 0;
      let gpAdded = 0;
      let packsAdded = { Iconic: 0, Legend: 0, Black: 0 };
      let trainersAdded = 0;

      for (const m of mail) {
        if (m.type === 'pack' && m.rarity && ['Iconic','Legend','Black'].includes(m.rarity)) {
          packsAdded[m.rarity] += m.qty || 1;
        } else if (m.type === 'eCoins') {
          coinsAdded += m.amount || 0;
        } else if (m.type === 'gp') {
          gpAdded += m.amount || 0;
        } else if (m.type === 'trainer') {
          // Convert mail trainer to playerTrainers inventory item
          const token = Math.random().toString(36).slice(2, 10);
          userData.playerTrainers.push({
            token,
            name: m.trainerName || 'Trainer',
            rarity: 'S+',
            exp: m.exp || 0,
            createdAt: Date.now(),
          });
          trainersAdded += 1;
        }
      }

      // Apply
      userData.eCoins = (userData.eCoins || 0) + coinsAdded;
      userData.gp = (userData.gp || 0) + gpAdded;
      userData.inventory.freePacks.Iconic += packsAdded.Iconic;
      userData.inventory.freePacks.Legend += packsAdded.Legend;
      userData.inventory.freePacks.Black += packsAdded.Black;
      userData.mail = []; // clear

      client.setUserData(interaction.user.id, userData);

      const summary = [
        coinsAdded ? `+${coinsAdded} eCoins` : null,
        gpAdded ? `+${gpAdded.toLocaleString()} GP` : null,
        (packsAdded.Iconic || packsAdded.Legend || packsAdded.Black) ? `Packs — Iconic:${packsAdded.Iconic} Legend:${packsAdded.Legend} Black:${packsAdded.Black}` : null,
        trainersAdded ? `Trainers: S+ x${trainersAdded}` : null,
      ].filter(Boolean).join(' | ');

      return interaction.reply({ content: `Claimed: ${summary || 'Nothing'}`, ephemeral: true });
    }

    return interaction.reply({ content: 'Unknown mail action.', ephemeral: true });
  }
};
