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
    .addSubcommand(sc => sc.setName('shoot').setDescription('Take your daily penalty shot (once per day)')),

  async execute(interaction) {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);
    const sub = interaction.options.getSubcommand();
    const state = ensurePenaltyState(userData);

    const today = todayKey();
    if (state.date !== today) {
      state.date = today;
      state.milestones = {};
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
      const [action, direction, userId] = interaction.customId.split('_');
      if (action !== 'penalty') return;

      if (interaction.user.id !== userId) {
        return await interaction.reply({ content: '⛔ This button isn\'t for you.', ephemeral: true });
      }

      const { client } = interaction;
      const userData = client.getUserData(interaction.user.id);
      const state = ensurePenaltyState(userData);
      const today = todayKey();

      if (state.lastPlay === today) {
        return await interaction.reply({ content: '⛔ You already shot today.', ephemeral: true });
      }

      const keeper = ['left', 'center', 'right'][Math.floor(Math.random() * 3)];
      const scored = direction !== keeper;
      const delta = scored ? ON_SCORE : ON_MISS;

      state.remaining = Math.max(0, state.remaining - delta);
      state.lastPlay = today;

      let desc = scored
        ? `✅ **GOAL!**\nYou aimed **${direction}** and the keeper went **${keeper}**.\n\n🟢 Progress: **-${ON_SCORE}** steps`
        : `❌ **MISS!**\nYou aimed **${direction}** but the keeper went **${keeper}**.\n\n🔴 Progress: **-${ON_MISS}** steps`;

      let rewardText = '';

      // Milestone: 50 eCoins at 19
      if (state.remaining === 19 && !state.milestones.ecoin19) {
        if (!userData.mail) userData.mail = [];
        userData.mail.push({ id: Math.random().toString(36).slice(2, 10), type: 'eCoins', amount: 50, date: today });
        state.milestones.ecoin19 = true;
        rewardText += '\n\n⭐ Milestone: **+50 eCoins** (reached 19).';
      }

      // Milestones: +500 GP for ranges 35–20 and 18–1
      if ((state.remaining <= 35 && state.remaining >= 20) || (state.remaining <= 18 && state.remaining >= 1)) {
        state.milestones.gp = state.milestones.gp || {};
        if (!state.milestones.gp[state.remaining]) {
          if (!userData.mail) userData.mail = [];
          userData.mail.push({ id: Math.random().toString(36).slice(2, 10), type: 'gp', amount: 500, date: today });
          state.milestones.gp[state.remaining] = true;
          rewardText += `\n\n💵 Milestone: **+500 GP** (landed on ${state.remaining}).`;
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