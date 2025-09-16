const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const config = require('../config.json');
const players = require('../players.json');

function getAvailablePacks(userData) {
  const fp = (userData.inventory && userData.inventory.freePacks) || { Iconic: 0, Legend: 0, Black: 0 };
  const options = [];
  if (fp.Iconic > 0) options.push({ name: `Iconic Pack (${fp.Iconic})`, value: 'Iconic' });
  if (fp.Legend > 0) options.push({ name: `Legend Pack (${fp.Legend})`, value: 'Legend' });
  if (fp.Black > 0) options.push({ name: `Black Pack (${fp.Black})`, value: 'Black' });
  return options;
}

function pullByRarity(rarity) {
  const pool = players.filter(p => p.rarity === rarity);
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('use')
    .setDescription('Use a free item')
    .addStringOption(o => o
      .setName('pack')
      .setDescription('Free pack to open')
      .setAutocomplete(true)
      .setRequired(true)
    ),

  async autocomplete(interaction) {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);
    const opts = getAvailablePacks(userData).slice(0, 25);
    await interaction.respond(opts);
  },

  async execute(interaction) {
    const { client } = interaction;
    const userData = client.getUserData(interaction.user.id);
    const rarity = interaction.options.getString('pack');

    if (!['Iconic', 'Legend', 'Black'].includes(rarity)) {
      return await interaction.reply({ content: 'Invalid pack selection.', ephemeral: true });
    }

    const fp = (userData.inventory && userData.inventory.freePacks) || { Iconic: 0, Legend: 0, Black: 0 };
    if (!fp[rarity] || fp[rarity] <= 0) {
      return await interaction.reply({ content: `You have no free ${rarity} packs.`, ephemeral: true });
    }

    // Consume one pack
    fp[rarity] -= 1;
    userData.inventory.freePacks = fp;

    const pulled = pullByRarity(rarity);
    if (!pulled) {
      return await interaction.reply({ content: `No players available for rarity ${rarity}.`, ephemeral: true });
    }

    // Defer to allow preview + delay safely
    await interaction.deferReply();

// 1) Send initial reply immediately
await interaction.editReply({ content: `Opening free ${rarity} pack...` });
await new Promise(r => setTimeout(r, 1000));

// 2) Send rarity GIF preview for 10 seconds
const preview = new EmbedBuilder()
  .setTitle(`Free ${rarity} Pack — Opening...`)
  .setColor(rarity === 'Iconic' ? '#FF00FF' : (rarity === 'Legend' ? '#FFD700' : '#000000'));

const gif = getRarityGif(rarity);
let files = [];
if (gif) {
  if (gif.type === 'attachment') {
    preview.setImage(`attachment://${gif.filename}`);
    files = [gif.filePath];
  } else if (gif.type === 'url') {
    preview.setImage(gif.url);
  }
}
await interaction.editReply({ embeds: [preview], files });
await new Promise(r => setTimeout(r, 10000));

    // Add to collection unless duplicate; duplicates convert to GP
    const isDuplicate = userData.players.some(p => p.id === pulled.id);
    let footer = '';
    if (isDuplicate) {
      // Simple sellback values aligned with gacha.js
      const sellValue = { Iconic: 50000, Legend: 25000, Black: 10000 }[rarity] || 5000;
      userData.gp += sellValue;
      footer = `Duplicate! +${sellValue.toLocaleString()} GP.`;
    } else {
      userData.players.push(pulled);
      footer = 'New player added to your collection!';
    }

    client.setUserData(interaction.user.id, userData);

    const embed = new EmbedBuilder()
      .setTitle(`Free ${rarity} Pack — Result`)
      .setColor(rarity === 'Iconic' ? '#FF00FF' : (rarity === 'Legend' ? '#FFD700' : '#000000'))
      .setDescription(`You opened a free ${rarity} pack and got **${pulled.name}**!`)
      .addFields(
        { name: 'Overall', value: String(pulled.overall), inline: true },
        { name: 'Position', value: pulled.position, inline: true },
      )
      .setFooter({ text: footer });

    await interaction.editReply({ embeds: [embed], files: [] });
  }
};

function getRarityGif(rarity) {
  const lower = String(rarity || '').toLowerCase();
  const filename = `${lower}.gif`;
  const filePath = path.join(__dirname, '..', 'assets', 'gifs', filename);
  if (fs.existsSync(filePath)) {
    return { type: 'attachment', filename, filePath };
  }
  const url = config?.gachaGifs?.[rarity];
  if (url) return { type: 'url', url };
  return null;
}
