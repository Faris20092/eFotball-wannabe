const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const START_STEPS = 35;
const ON_SCORE = 8;
const ON_MISS = 4;

function todayKey() {
  const d = new Date();
  return d.toISOString().slice(0, 10);
}

function ensurePenaltyState(userData) {
  if (!userData.minigames) userData.minigames = {};
  if (!userData.minigames.penalty) {
    userData.minigames.penalty = {
      date: '',
      lastPlay: '',
      remaining: START_STEPS,
      milestones: {},
    };
  }
  return userData.minigames.penalty;
}

function rewardUserToMail(userData) {
  if (!userData.mail) userData.mail = [];
  const roll = Math.random();
  // 0.6% chance to get an S+ Trainer (1,000,000 EXP)
  if (roll < 0.006) {
    userData.mail.push({
      id: Math.random().toString(36).slice(2, 10),
      type: 'trainer',
      trainerName: 'S+ Trainer',
      exp: 1000000,
      date: todayKey(),
    });
    return '🧑‍🏫 Ultra Rare Reward: **S+ Trainer** (+1,000,000 EXP) added to your mail!';
  } else if (roll < 0.34) {
    const rarities = ['Iconic', 'Legend', 'Black'];
    const r = rarities[Math.floor(Math.random() * rarities.length)];
    userData.mail.push({
      id: Math.random().toString(36).slice(2, 10),
      type: 'pack',
      rarity: r,
      qty: 1,
      date: todayKey(),
    });
    return `🎁 Free **${r} Pack** added to your mail.`;
  } else if (roll < 0.67) {
    const amount = 100;
    userData.mail.push({
      id: Math.random().toString(36).slice(2, 10),
      type: 'eCoins',
      amount,
      date: todayKey(),
    });
    return `💰 **+${amount} eCoins** added to your mail.`;
  } else {
    const amount = 5000;
    userData.mail.push({
      id: Math.random().toString(36).slice(2, 10),
      type: 'gp',
      amount,
      date: todayKey(),
    });
    return `💵 **+${amount.toLocaleString()} GP** added to your mail.`;
  }
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('penalty')
    .setDescription('Daily penalty minigame')
    .addSubcommand(sc => sc.setName('status').setDescription('View your daily penalty progress'))
    .addSubcommand(sc => sc.setName('shoot').setDescription('Take your daily penalty shot (once per day)'))
    .addSubcommand(sc => sc.setName('admin-shoot').setDescription('[ADMIN] Unlimited penalty shots'))
    .addSubcommand(sc => sc.setName('admin-reset').setDescription('[ADMIN] Reset daily penalty status')),

  async execute(interaction) {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);
    const sub = interaction.options.getSubcommand();
    const state = ensurePenaltyState(userData);

    // Check if user is admin
    const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
    const isAdmin = ADMIN_IDS.includes(interaction.user.id);

    const today = todayKey();
    if (state.date !== today) {
      state.date = today;
      state.milestones = {};
    }

    // Admin commands
    if (sub === 'admin-reset') {
      if (!isAdmin) {
        return await interaction.reply({ content: '❌ This command is admin-only.', ephemeral: true });
      }
      
      state.lastPlay = '';
      state.remaining = START_STEPS;
      state.milestones = {};
      client.saveUserData(interaction.user.id, userData);
      
      return await interaction.reply({ 
        content: '✅ **Admin Reset Complete**\n• Daily shot reset\n• Path reset to 35\n• Milestones cleared', 
        ephemeral: true 
      });
    }

    if (sub === 'admin-shoot') {
      if (!isAdmin) {
        return await interaction.reply({ content: '❌ This command is admin-only.', ephemeral: true });
      }
      
      // Admin can shoot unlimited times - bypass daily check
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('penalty_left').setLabel('⬅️ Left').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('penalty_center').setLabel('⬆️ Center').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('penalty_right').setLabel('➡️ Right').setStyle(ButtonStyle.Primary)
      );

      return await interaction.reply({
        content: '🔑 **[ADMIN MODE]** Choose your direction:',
        components: [row],
        ephemeral: true
      });
    }

    if (sub === 'status') {
      const embed = new EmbedBuilder()
        .setTitle('📊 Daily Penalty — Status')
        .setColor('#5865F2')
        .setDescription(`🎯 Remaining path: **${state.remaining}**\n⚽ On Goal: -${ON_SCORE} • ❌ On Miss: -${ON_MISS}`)
        .addFields({ name: "📅 Today's Shot", value: state.lastPlay === today ? '✔️ Used' : '⏳ Available', inline: true })
        .setFooter({ text: 'You only get 1 shot per day. Reach 0 to earn a reward, then it resets to 35.' });

      return await interaction.reply({ embeds: [embed], ephemeral: true });
    }

    if (sub === 'shoot') {
      if (state.lastPlay === today) {
        const embed = new EmbedBuilder()
          .setTitle('⚽ Daily Penalty')
          .setColor('#F1C40F')
          .setDescription('⛔ You already used your penalty shot today.\nCome back tomorrow!');
        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      const embed = new EmbedBuilder()
        .setTitle('⚽ Daily Penalty — Choose Your Aim')
        .setColor('#2ECC71')
        .setDescription('Pick your shot direction by pressing a button:\n\n```      🧍 Keeper\n   |   ⚽   |   \n```')
        .setFooter({ text: 'You only get 1 shot per day. Choose wisely!' });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`penalty_left_${interaction.user.id}`).setLabel('Left').setEmoji('⬅️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_center_${interaction.user.id}`).setLabel('Center').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId(`penalty_right_${interaction.user.id}`).setLabel('Right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
      );

      return await interaction.reply({ embeds: [embed], components: [row] });
    }
  },

  async handleButton(interaction) {
    try {
      const parts = interaction.customId.split('_');
      const action = parts[0];
      const direction = parts[1];
      
      if (action !== 'penalty') return;

      const { client } = interaction;
      const userData = client.getUserData(interaction.user.id);
      const state = ensurePenaltyState(userData);
      const today = todayKey();
      
      // Check if admin is using admin-shoot (no daily limit)
      const ADMIN_IDS = (process.env.ADMIN_IDS || '').split(',').map(id => id.trim());
      const isAdmin = ADMIN_IDS.includes(interaction.user.id);
      const isAdminMode = interaction.message.content.includes('[ADMIN MODE]');

      // Only check daily limit if NOT in admin mode
      if (!isAdminMode && state.lastPlay === today) {
        return await interaction.reply({ content: '⛔ You already shot today.', ephemeral: true });
      }

      const keeper = ['left', 'center', 'right'][Math.floor(Math.random() * 3)];
      const scored = direction !== keeper;
      const delta = scored ? ON_SCORE : ON_MISS;

      const oldRemaining = state.remaining;
      state.remaining = Math.max(0, state.remaining - delta);
      const newRemaining = state.remaining;
      
      // Only update lastPlay if NOT in admin mode
      if (!isAdminMode) {
        state.lastPlay = today;
      }

      const modePrefix = isAdminMode ? '🔑 **[ADMIN MODE]**\n' : '';
      let desc = scored
        ? `${modePrefix}✅ **GOAL!**\nYou aimed **${direction}** and the keeper went **${keeper}**.\n\n🟢 Progress: **-${ON_SCORE}** steps`
        : `${modePrefix}❌ **MISS!**\nYou aimed **${direction}** but the keeper went **${keeper}**.\n\n🔴 Progress: **-${ON_MISS}** steps`;

      let rewardText = '';

      // Check if player passed through milestone 19 (50 eCoins)
      if (oldRemaining > 19 && newRemaining <= 19 && !state.milestones.ecoin19) {
        if (!userData.mail) userData.mail = [];
        userData.mail.push({ id: Math.random().toString(36).slice(2, 10), type: 'eCoins', amount: 50, date: today });
        state.milestones.ecoin19 = true;
        rewardText += '\n\n⭐ Milestone: **+50 eCoins** (passed 19).';
      }

      // Give +500 GP for landing position if in valid ranges (35–20 or 18–1)
      if ((newRemaining <= 35 && newRemaining >= 20) || (newRemaining <= 18 && newRemaining >= 1)) {
        state.milestones.gp = state.milestones.gp || {};
        if (!state.milestones.gp[newRemaining]) {
          if (!userData.mail) userData.mail = [];
          userData.mail.push({ id: Math.random().toString(36).slice(2, 10), type: 'gp', amount: 500, date: today });
          state.milestones.gp[newRemaining] = true;
          rewardText += `\n\n💵 **+500 GP** (landed on ${newRemaining}).`;
        }
      }

      if (state.remaining === 0) {
        const rewardMsg = rewardUserToMail(userData);
        rewardText = rewardText ? `${rewardText}\n\n${rewardMsg}` : rewardMsg;
        state.remaining = START_STEPS;
      }

      client.setUserData(interaction.user.id, userData);

      const embed = new EmbedBuilder()
        .setTitle('⚽ Daily Penalty — Result ⚽')
        .setColor(scored ? '#2ECC71' : '#E74C3C')
        .setDescription(desc)
        .addFields(
          { name: '📊 Remaining Steps', value: `${state.remaining}`, inline: true },
          { name: "📅 Today's Shot", value: '✔️ Used', inline: true }
        )
        .setFooter({ text: 'You can only shoot once per day. Reach 0 to earn a reward, then it resets to 35.' });

      if (rewardText) {
        embed.addFields({ name: '🎁 Rewards', value: rewardText });
      }

      await interaction.update({ embeds: [embed], components: [] });
    } catch (error) {
      console.error('Penalty button error:', error);
      try {
        await interaction.reply({ content: 'An error occurred. Please try again.', ephemeral: true });
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }
};