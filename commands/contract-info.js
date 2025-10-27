const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const players = require('../players.json');
const { PACKS } = require('../shared/pack-config');

const RARITY_EMOJIS = {
  'Iconic': '💎',
  'Legend': '🌟',
  'Black': '⚫',
  'Gold': '🟡',
  'Silver': '⚪',
  'Bronze': '🟤',
  'White': '⬜',
};

function topPlayersForPack(packKey) {
  const pack = PACKS[packKey];
  if (!pack) return [];
  
  // Use includeRarities if available, otherwise fall back to rarity_chances
  const allowedRarities = pack.includeRarities || 
    Object.entries(pack.rarity_chances)
      .filter(([, chance]) => Number(chance) > 0)
      .map(([rarity]) => rarity);

  const pool = players.filter(p => allowedRarities.includes(p.rarity));
  // Sort by level 1 overall (base overall rating)
  const sorted = pool
    .map(p => ({
      id: p.id,
      name: p.name,
      rarity: p.rarity,
      position: p.position,
      overall: p.overall, // Level 1 overall
      maxOverall: typeof p.maxOverall === 'number' ? p.maxOverall : p.overall,
    }))
    .sort((a, b) => b.overall - a.overall)
    .slice(0, 10);

  return sorted;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('contract-info')
    .setDescription('Show info about contract packs')
    .addStringOption(option =>
      option.setName('pack')
        .setDescription('Specific pack to show info for')
        .setRequired(false)
        .addChoices(
          { name: 'Iconic Moment Pack', value: 'iconic' },
          { name: 'Legend Box Draw', value: 'legend' },
          { name: 'Standard Pack', value: 'standard' }
        )
    ),

  async execute(interaction) {
    try {
      const packChoice = interaction.options.getString('pack');
      const embeds = [];

      if (packChoice) {
        // Show info for specific pack only
        const pack = PACKS[packChoice];
        if (!pack) {
          return await interaction.reply({ content: 'Invalid pack selection.', ephemeral: true });
        }

        const top = topPlayersForPack(packChoice);
        const chances = Object.entries(pack.rarity_chances)
          .filter(([, v]) => v > 0)
          .sort((a, b) => b[1] - a[1])
          .map(([rarity, chance]) => `${RARITY_EMOJIS[rarity] || ''} ${rarity}: ${(chance * 100).toFixed(1)}%`)
          .join('\n');

        const topLines = top.map((p, i) => {
          const emoji = RARITY_EMOJIS[p.rarity] || '';
          return `#${i + 1} ${emoji} **${p.name}** — ${p.position} — ${p.overall} OVR`;
        });

        const embed = new EmbedBuilder()
          .setTitle(`${pack.name}`)
          .setColor('#8e44ad')
          .setDescription(pack.description)
          .addFields(
            { name: 'Cost', value: `${pack.cost.toLocaleString()} ${pack.currency}`, inline: true },
            { name: 'Rarity Chances', value: chances || '—', inline: true },
          );

        embed.addFields({ name: 'Top 10 Players', value: topLines.join('\n') || 'No players found.' });

        embeds.push(embed);
      } else {
        // Show info for all packs (original behavior)
        for (const [key, pack] of Object.entries(PACKS)) {
          const top = topPlayersForPack(key);
          const chances = Object.entries(pack.rarity_chances)
            .filter(([, v]) => v > 0)
            .sort((a, b) => b[1] - a[1])
            .map(([rarity, chance]) => `${RARITY_EMOJIS[rarity] || ''} ${rarity}: ${(chance * 100).toFixed(1)}%`)
            .join('\n');

          const topLines = top.map((p, i) => {
            const emoji = RARITY_EMOJIS[p.rarity] || '';
            return `#${i + 1} ${emoji} **${p.name}** — ${p.position} — ${p.overall} OVR`;
          });

          const embed = new EmbedBuilder()
            .setTitle(`${pack.name}`)
            .setColor('#8e44ad')
            .setDescription(pack.description)
            .addFields(
              { name: 'Cost', value: `${pack.cost.toLocaleString()} ${pack.currency}`, inline: true },
              { name: 'Rarity Chances', value: chances || '—', inline: true },
            );

          embed.addFields({ name: 'Top 10 Players', value: topLines.join('\n') || 'No players found.' });

          embeds.push(embed);
        }
      }
      
      // Send pack embed(s) in a single reply
      await interaction.reply({ embeds });
    } catch (err) {
      console.error('contract-info error:', err);
      try { await interaction.reply({ content: 'There was an error while generating the contract info.', ephemeral: true }); } catch {}
    }
  }
};
