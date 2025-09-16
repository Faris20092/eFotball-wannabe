const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const RARITIES = ['Iconic', 'Legend', 'Black', 'Gold', 'Silver', 'Bronze', 'White'];

// In-memory pagination state (token -> state)
const STATE = new Map();
function token() { return Math.random().toString(36).slice(2, 10); }

function getPositions() {
  return ['GK','CB','LB','RB','DMF','CMF','AMF','LMF','RMF','LWF','RWF','SS','CF'];
}

function applyFiltersAndSort(allPlayers, { rarity, sort, position, playingStyle, club }) {
  let players = Array.isArray(allPlayers) ? [...allPlayers] : [];
  if (rarity) players = players.filter(p => p.rarity === rarity);
  if (position) players = players.filter(p => p.position === position);
  if (playingStyle) players = players.filter(p => (p.playingStyle || '').toLowerCase().includes(playingStyle.toLowerCase()));
  if (club) players = players.filter(p => (p.club || '').toLowerCase().includes(club.toLowerCase()));

  switch (sort) {
    case 'ovr_asc': players.sort((a,b)=>(a.overall??0)-(b.overall??0)); break;
    case 'name_asc': players.sort((a,b)=>(a.name||'').localeCompare(b.name||'')); break;
    case 'name_desc': players.sort((a,b)=>(b.name||'').localeCompare(a.name||'')); break;
    case 'ovr_desc': default: players.sort((a,b)=>(b.overall??0)-(a.overall??0)); break;
  }
  return players;
}

function pageEmbed(user, filteredPlayers, opts) {
  const pageSize = 20;
  const total = filteredPlayers.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(Math.max(1, opts.page || 1), totalPages);
  const start = (currentPage - 1) * pageSize;
  const slice = filteredPlayers.slice(start, start + pageSize);
  const lines = slice.map(p => `• ${p.name} — ${p.position} — ${p.rarity} — OVR ${p.overall}`);
  const desc = lines.length ? lines.join('\n') : 'No players match your filter.';
  const titleParts = [`${user.username}'s Collection`];
  if (opts.rarity) titleParts.push(`(${opts.rarity})`);

  const embed = new EmbedBuilder()
    .setTitle(titleParts.join(' '))
    .setColor('#00bcd4')
    .setFooter({ text: `Page ${currentPage}/${totalPages} • Total: ${total}` })
    .setDescription(desc);

  return { embed, totalPages, currentPage };
}

function buildButtons(tok, page, totalPages) {
  const prevId = `collection:${tok}:prev`;
  const nextId = `collection:${tok}:next`;
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(prevId).setStyle(ButtonStyle.Secondary).setLabel('Prev').setDisabled(page <= 1),
    new ButtonBuilder().setCustomId(nextId).setStyle(ButtonStyle.Secondary).setLabel('Next').setDisabled(page >= totalPages)
  );
  return [row];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('collection')
    .setDescription('View your owned players, with optional filters and pagination')
    .addStringOption(option =>
      option.setName('rarity')
        .setDescription('Filter by rarity')
        .addChoices(
          { name: 'Iconic', value: 'Iconic' },
          { name: 'Legend', value: 'Legend' },
          { name: 'Black', value: 'Black' },
          { name: 'Gold', value: 'Gold' },
          { name: 'Silver', value: 'Silver' },
          { name: 'Bronze', value: 'Bronze' },
          { name: 'White', value: 'White' },
        ))
    .addStringOption(option =>
      option.setName('position')
        .setDescription('Filter by position')
        .addChoices(...getPositions().map(p => ({ name: p, value: p })))
    )
    .addStringOption(option =>
      option.setName('playingstyle')
        .setDescription('Filter by playing style (contains)')
    )
    .addStringOption(option =>
      option.setName('club')
        .setDescription('Filter by club (contains)')
    )
    .addStringOption(option =>
      option.setName('sort')
        .setDescription('Sort order')
        .addChoices(
          { name: 'Overall (High → Low)', value: 'ovr_desc' },
          { name: 'Overall (Low → High)', value: 'ovr_asc' },
          { name: 'Name (A → Z)', value: 'name_asc' },
          { name: 'Name (Z → A)', value: 'name_desc' },
        ))
    .addIntegerOption(option =>
      option.setName('page')
        .setDescription('Page number')
        .setMinValue(1)
    ),

  async execute(interaction) {
    try {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);

    const rarity = interaction.options.getString('rarity');
    const position = interaction.options.getString('position');
    const playingStyle = interaction.options.getString('playingstyle');
    const club = interaction.options.getString('club');
    const sort = interaction.options.getString('sort') || 'ovr_desc';
    const page = interaction.options.getInteger('page') || 1;

    const filtered = applyFiltersAndSort(userData.players, { rarity, sort, position, playingStyle, club });
    const { embed, totalPages, currentPage } = pageEmbed(interaction.user, filtered, { rarity, page });

    const tok = token();
    STATE.set(tok, { u: interaction.user.id, r: rarity || '', s: sort, p: position || '', ps: playingStyle || '', c: club || '', pg: currentPage, totalPages });
    const components = buildButtons(tok, currentPage, totalPages);

    await interaction.reply({ embeds: [embed], components });
    } catch (err) {
      console.error('collection execute error:', err);
      try { await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true }); } catch {}
    }
  }
,
  // Button handler for pagination
  async handleButton(interaction) {
    try {
      if (!interaction.customId.startsWith('collection:')) return;
      const parts = interaction.customId.split(':'); // [collection, token, action]
      const tok = parts[1];
      const action = parts[2];
      const state = STATE.get(tok);
      if (!state) return;
      if (interaction.user.id !== state.u) {
        return interaction.reply({ content: 'This pagination belongs to another user.', ephemeral: true });
      }
      state.pg = Math.max(1, Math.min(state.totalPages || 1, state.pg + (action === 'next' ? 1 : -1)));
      const { client } = interaction;
      const userData = client.getUserData(state.u);
      const filtered = applyFiltersAndSort(userData.players, { rarity: state.r, sort: state.s, position: state.p, playingStyle: state.ps, club: state.c });
      const pageData = pageEmbed(interaction.user, filtered, { rarity: state.r, page: state.pg });
      state.totalPages = pageData.totalPages; // update if changed
      const components = buildButtons(tok, pageData.currentPage, pageData.totalPages);
      await interaction.update({ embeds: [pageData.embed], components });
    } catch (err) {
      console.error('collection button error:', err);
      try { await interaction.reply({ content: 'There was an error updating the page.', ephemeral: true }); } catch {}
    }
  }
};
