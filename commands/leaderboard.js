const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

function tryReadUser(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (_) {
    return null;
  }
}

function computeStrength(user) {
  // Prefer tracked strengths
  const best = user?.stats?.bestStrength;
  if (typeof best === 'number' && best > 0) return Math.round(best);
  // Fallback: average of players' overall
  const players = Array.isArray(user?.players) ? user.players : [];
  if (!players.length) return 0;
  const sum = players.reduce((a, p) => a + (p.overall || 0), 0);
  return Math.round(sum / players.length);
}

async function getServerUserIds(guild) {
    try {
      // Use cache instead of fetch to avoid timeout
      const members = guild.members.cache;
      return new Set(members.map(m => m.user.id));
    } catch {
      return new Set();
    }
  }

function loadAllUsers(dataDir) {
  const out = [];
  const files = fs.existsSync(dataDir) ? fs.readdirSync(dataDir) : [];
  for (const f of files) {
    if (!f.endsWith('.json')) continue;
    const u = tryReadUser(path.join(dataDir, f));
    // Only include users who have played (have stats) and are not bots
    if (u && u.id && u.stats && !u.bot) {
      out.push(u);
    }
  }
  return out;
}

function rankUsers(users, metric, guild = null) {
    const arr = users
      .filter(u => {
        // Additional filter: must have played at least 1 match
        const totalMatches = (u?.stats?.wins || 0) + (u?.stats?.draws || 0) + (u?.stats?.losses || 0);
        return totalMatches > 0;
      })
      .map(u => {
        const gp = Number(u.gp || 0);
        const wins = Number(u?.stats?.wins || 0);
        const strength = computeStrength(u);
        
        // Try to get username from guild if available
        let name = u.username || u.tag || u.id;
        if (guild && guild.members.cache.has(u.id)) {
          const member = guild.members.cache.get(u.id);
          name = member.user.username || member.displayName || name;
        }
        
        return { id: u.id, name, gp, wins, strength };
      });
    
    switch (metric) {
      case 'wins':
        arr.sort((a, b) => b.wins - a.wins || b.gp - a.gp);
        break;
      case 'strength':
        arr.sort((a, b) => b.strength - a.strength || b.gp - a.gp);
        break;
      case 'gp':
      default:
        arr.sort((a, b) => b.gp - a.gp || b.wins - a.wins);
        break;
    }
    return arr;
  }

module.exports = {
    data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Show leaderboards for GP, wins, or team strength')
    .addStringOption(o => o
      .setName('metric')
      .setDescription('Ranking metric')
      .setRequired(true)
      .addChoices(
        { name: 'GP', value: 'gp' },
        { name: 'Wins', value: 'wins' },
        { name: 'Strength', value: 'strength' },
      ))
    .addStringOption(o => o
      .setName('scope')
      .setDescription('Global or this server only')
      .setRequired(true)
      .addChoices(
        { name: 'Global', value: 'global' },
        { name: 'Server', value: 'server' },
      )),

  async execute(interaction) {
    try {
      const metric = interaction.options.getString('metric');
      const scope = interaction.options.getString('scope');
      const p = interaction.options.getInteger('page') || 1;
      const { guild } = interaction;

      const dataDir = path.join(__dirname, '..', 'data');
      const users = loadAllUsers(dataDir);

      let filtered = users;
      if (scope === 'server' && guild) {
        const serverIds = await getServerUserIds(guild);
        filtered = users.filter(u => serverIds.has(u.id));
      }

      const ranked = rankUsers(filtered, metric, guild);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize));
      const validPage = Math.min(Math.max(1, p), totalPages);
      const start = (validPage - 1) * pageSize;

      const lines = ranked.slice(start, start + pageSize).map((r, i) => {
        const pos = start + i + 1;
        let val = '';
        if (metric === 'gp') val = `${r.gp.toLocaleString()} GP`;
        if (metric === 'wins') val = `${r.wins} wins`;
        if (metric === 'strength') val = `${r.strength}`;
        const name = r.name || r.id;
        return `#${pos} — **${name}** — ${val}`;
      });

      const titleMetric = metric === 'gp' ? 'GP' : (metric === 'wins' ? 'Wins' : 'Strength');
      const titleScope = scope === 'server' ? `Server: ${guild?.name || ''}` : 'Global';

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Leaderboard — ${titleMetric} (${titleScope})`)
        .setColor('#f39c12')
        .setDescription(lines.length ? lines.join('\n') : 'No data yet. Play some matches and earn GP!')
        .setFooter({ text: `Page ${validPage}/${totalPages} • Use /leaderboard metric:<m> scope:<s> page:<n>` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`leaderboard_${metric}_${scope}_${validPage - 1}`)
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(validPage <= 1),
        new ButtonBuilder()
          .setCustomId(`leaderboard_${metric}_${scope}_${validPage + 1}`)
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(validPage >= totalPages)
      );

      await interaction.reply({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    } catch (error) {
      console.error('Leaderboard execute error:', error);
      try { await interaction.reply({ content: '❌ Error loading leaderboard. Please try again!', ephemeral: true }); } catch {}
    }
  },

  async handleButton(interaction) {
    try {
      if (!interaction.customId || !interaction.customId.startsWith('leaderboard_')) return;
      const [action, metric, scope, page] = interaction.customId.split('_');
      if (action !== 'leaderboard') return;

      const p = parseInt(page, 10) || 1;
      const { guild } = interaction;

      const dataDir = path.join(__dirname, '..', 'data');
      const users = loadAllUsers(dataDir);

      let filtered = users;
      if (scope === 'server' && guild) {
        const serverIds = await getServerUserIds(guild);
        filtered = users.filter(u => serverIds.has(u.id));
      }

      const ranked = rankUsers(filtered, metric);
      const pageSize = 10;
      const totalPages = Math.max(1, Math.ceil(ranked.length / pageSize));
      const validPage = Math.min(Math.max(1, p), totalPages);
      const start = (validPage - 1) * pageSize;

      const lines = ranked.slice(start, start + pageSize).map((r, i) => {
        const pos = start + i + 1;
        let val = '';
        if (metric === 'gp') val = `${r.gp.toLocaleString()} GP`;
        if (metric === 'wins') val = `${r.wins} wins`;
        if (metric === 'strength') val = `${r.strength}`;
        const name = r.name || r.id;
        return `#${pos} — **${name}** — ${val}`;
      });

      const titleMetric = metric === 'gp' ? 'GP' : (metric === 'wins' ? 'Wins' : 'Strength');
      const titleScope = scope === 'server' ? `Server: ${guild?.name || ''}` : 'Global';

      const embed = new EmbedBuilder()
        .setTitle(`🏆 Leaderboard — ${titleMetric} (${titleScope})`)
        .setColor('#f39c12')
        .setDescription(lines.length ? lines.join('\n') : 'No data yet. Play some matches and earn GP!')
        .setFooter({ text: `Page ${validPage}/${totalPages} • Use /leaderboard metric:<m> scope:<s>` });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`leaderboard_${metric}_${scope}_${validPage - 1}`)
          .setLabel('◀️ Previous')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(validPage <= 1),
        new ButtonBuilder()
          .setCustomId(`leaderboard_${metric}_${scope}_${validPage + 1}`)
          .setLabel('Next ▶️')
          .setStyle(ButtonStyle.Secondary)
          .setDisabled(validPage >= totalPages)
      );

      await interaction.update({ embeds: [embed], components: totalPages > 1 ? [row] : [] });
    } catch (error) {
      console.error('Leaderboard button error:', error);
      try { await interaction.reply({ content: '❌ Error updating leaderboard. Please try again!', ephemeral: true }); } catch {}
    }
  }
};