const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');
const players = require('../players.json');
const config = require('../config.json');
const { PACKS, loadPackLimits, savePackLimits } = require('../shared/pack-config');

const RARITY_SELL_VALUE = {
  'Iconic': 50000,
  'Legend': 25000,
  'Black': 10000,
  'Gold': 5000,
  'Silver': 2500,
  'Bronze': 1000,
  'White': 500,
};

const RARITY_COLORS = {
  'Iconic': '#FF00FF',
  'Legend': '#FFD700',
  'Black': '#000000',
  'Gold': '#FFC300',
  'Silver': '#C0C0C0',
  'Bronze': '#CD7F32',
  'White': '#FFFFFF',
};

const RARITY_EMOJIS = {
  'Iconic': '💎',
  'Legend': '🌟',
  'Black': '⚫',
  'Gold': '🟡',
  'Silver': '⚪',
  'Bronze': '🟤',
  'White': '⬜',
};

const PACK_EMOJIS = {
  'iconic': '💎',
  'legend': '🏆',
  'standard': '📦',
};

// Animation messages for pack opening
const PACK_OPENING_MESSAGES = [
  "🎁 Opening pack...",
];

function selectRarity(chances) {
  const rand = Math.random();
  let cumulative = 0;
  for (const rarity in chances) {
    cumulative += chances[rarity];
    if (rand < cumulative) return rarity;
  }
  return Object.keys(chances)[Object.keys(chances).length - 1];
}

function pullPlayer(rarity, allowedRarities) {
  if (Array.isArray(allowedRarities) && allowedRarities.length > 0 && !allowedRarities.includes(rarity)) {
    return null;
  }
  
  const filteredPlayers = players.filter(p => p.rarity === rarity);
  if (filteredPlayers.length === 0) return null;
  return filteredPlayers[Math.floor(Math.random() * filteredPlayers.length)];
}

function getRarityGif(rarity) {
  const lower = String(rarity || '').toLowerCase();
  const filename = `${lower}.gif`;
  const filePath = path.join(__dirname, '..', 'assets', 'gifs', filename);
  if (fs.existsSync(filePath)) {
    return { type: 'attachment', filename, filePath };
  }
  const url = config?.contractGifs?.[rarity] || config?.gachaGifs?.[rarity];
  if (url) return { type: 'url', url };
  return null;
}

function getPackOpeningGif(packName) {
  const filename = `pack_${packName}.gif`;
  const filePath = path.join(__dirname, '..', 'assets', 'gifs', filename);
  if (fs.existsSync(filePath)) {
    return { type: 'attachment', filename, filePath };
  }
  // Fallback to generic pack opening gif
  const genericPath = path.join(__dirname, '..', 'assets', 'gifs', 'pack_opening.gif');
  if (fs.existsSync(genericPath)) {
    return { type: 'attachment', filename: 'pack_opening.gif', filePath: genericPath };
  }
  return null;
}

function getHighestRarity(pullResults) {
  const rarityPriority = { 'Iconic': 7, 'Legend': 6, 'Black': 5, 'Gold': 4, 'Silver': 3, 'Bronze': 2, 'White': 1 };
  let highest = 'White';
  let highestPriority = 0;
  
  pullResults.forEach(result => {
    const priority = rarityPriority[result.player.rarity] || 0;
    if (priority > highestPriority) {
      highestPriority = priority;
      highest = result.player.rarity;
    }
  });
  
  return highest;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('contract2')
    .setDescription('Pull up to 10 players at once with animated pack opening')
    .addStringOption(option =>
      option.setName('pack')
        .setDescription('Choose a contract pack')
        .setRequired(true)
        .addChoices(
          { name: 'Iconic Moment Pack (500 eCoins)', value: 'iconic' },
          { name: 'Legend Box Draw (25,000 GP)', value: 'legend' },
          { name: 'Standard Pack (10,000 GP)', value: 'standard' }
        ))
    .addIntegerOption(option =>
      option.setName('count')
        .setDescription('Number of pulls (1-10)')
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(10)
    ),

  async execute(interaction) {
    try {
      const { client } = interaction;
      const userData = client.getUserData(interaction.user.id);

      // Initialize missing properties
      if (!userData.players) userData.players = [];
      if (typeof userData.gp !== 'number') userData.gp = 0;
      if (typeof userData.eCoins !== 'number') userData.eCoins = 0;

      const packName = interaction.options.getString('pack');
      const count = interaction.options.getInteger('count');
      const pack = PACKS[packName];

      if (!pack) {
        return await interaction.reply({ content: 'That pack does not exist.', ephemeral: true });
      }

      const totalCost = pack.cost * count;

      // Check currency
      if (pack.currency === 'GP') {
        if (userData.gp < totalCost) {
          return await interaction.reply({ 
            content: `Not enough GP. You need ${totalCost.toLocaleString()} GP for ${count} pull(s).`, 
            ephemeral: true 
          });
        }
      } else {
        if (userData.eCoins < totalCost) {
          return await interaction.reply({ 
            content: `Not enough eCoins. You need ${totalCost.toLocaleString()} eCoins for ${count} pull(s).`, 
            ephemeral: true 
          });
        }
      }

      // Start pack opening animation
      await interaction.reply({ content: "🎁 Preparing to open pack..." });

      // Process all pulls first (behind the scenes)
      const pullResults = [];
      let totalSellBack = 0;

      for (let i = 0; i < count; i++) {
        const targetRarity = selectRarity(pack.rarity_chances);
        let newPlayer = pullPlayer(targetRarity, pack.includeRarities);

        // Fallback if no player found for selected rarity
        if (!newPlayer && Array.isArray(pack.includeRarities)) {
          const fallback = pack.includeRarities.find(r => {
            const pool = players.filter(p => p.rarity === r);
            return pool.length > 0;
          });
          if (fallback) {
            newPlayer = pullPlayer(fallback, pack.includeRarities);
          }
        }

        if (!newPlayer) continue;

        // Ensure player has unique ID
        if (!newPlayer.id) {
          newPlayer.id = `${newPlayer.name}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
        }

        const isDuplicate = userData.players.some(p => p.id === newPlayer.id);
        let footerText = '';

        if (isDuplicate) {
          const sellValue = RARITY_SELL_VALUE[newPlayer.rarity] || 500;
          totalSellBack += sellValue;
          footerText = `Duplicate sold for ${sellValue.toLocaleString()} GP.`;
        } else {
          footerText = 'New player added to your collection!';
        }

        pullResults.push({ player: newPlayer, footerText, isDuplicate });
      }

      // Get highest rarity pulled
      const highestRarity = getHighestRarity(pullResults);
      
      // Show pack opening animation with highest rarity gif
      const packOpeningGif = getPackOpeningGif(packName);
      const highestRarityGif = getRarityGif(highestRarity);
      
      let animationFiles = [];
      let animationEmbed = new EmbedBuilder()
        .setTitle(`${PACK_EMOJIS[packName]} Opening ${pack.name}`)
        .setDescription(`Opening ${count} pack(s)...`)
        .setColor(RARITY_COLORS[highestRarity]);

      // Use highest rarity gif for animation
      if (highestRarityGif) {
        if (highestRarityGif.type === 'attachment') {
          animationEmbed.setImage(`attachment://${highestRarityGif.filename}`);
          animationFiles.push({
            attachment: highestRarityGif.filePath,
            name: highestRarityGif.filename
          });
        } else if (highestRarityGif.type === 'url') {
          animationEmbed.setImage(highestRarityGif.url);
        }
      }

      // Show animation for different durations
      await interaction.editReply({ 
        content: PACK_OPENING_MESSAGES[0], 
        embeds: [animationEmbed], 
        files: animationFiles 
      });

      // Animation sequence
      // Animation sequence - shorter delays to prevent timeout
      for (let i = 1; i < PACK_OPENING_MESSAGES.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second intervals
        animationEmbed.setDescription(`${PACK_OPENING_MESSAGES[i]}\nHighest rarity: ${RARITY_EMOJIS[highestRarity]} ${highestRarity}`);
        try {
          await interaction.editReply({ 
            content: PACK_OPENING_MESSAGES[i], 
      embeds: [animationEmbed], 
      files: animationFiles 
    });
  } catch (error) {
    console.log('Edit reply error:', error);
    break; // Exit animation loop if edit fails
  }
}

// Final delay - shorter
await new Promise(resolve => setTimeout(resolve, 10000));

      // Now deduct currency and process duplicates
      if (pack.currency === 'GP') {
        userData.gp -= totalCost;
      } else {
        userData.eCoins -= totalCost;
      }

      // Add new players and process duplicates
      pullResults.forEach(result => {
        if (!result.isDuplicate) {
          userData.players.push(result.player);
        } else {
          const sellValue = RARITY_SELL_VALUE[result.player.rarity] || 500;
          userData.gp += sellValue;
        }
      });

      // Sort results by rarity priority
      const rarityPriority = { 'Iconic': 7, 'Legend': 6, 'Black': 5, 'Gold': 4, 'Silver': 3, 'Bronze': 2, 'White': 1 };
      pullResults.sort((a, b) => {
        const priorityA = rarityPriority[a.player.rarity] || 0;
        const priorityB = rarityPriority[b.player.rarity] || 0;
        return priorityB - priorityA;
      });

      // Create result embeds
      const embeds = [];
      const filesMap = new Map();

      pullResults.forEach((result, index) => {
        const { player: newPlayer, footerText } = result;
        const s = newPlayer.stats || {};
        const skills = (newPlayer.skills || []).slice(0, 5).join(', ') || 'None';

        const rarityEmoji = RARITY_EMOJIS[newPlayer.rarity] || '';
        const embed = new EmbedBuilder()
          .setTitle(`${rarityEmoji} Contract Result #${index + 1}`)
          .setDescription(`You pulled **${newPlayer.name}**`)
          .setColor(RARITY_COLORS[newPlayer.rarity] || '#0099ff')
          .addFields(
            { name: 'Rarity', value: `${rarityEmoji} ${newPlayer.rarity}`, inline: true },
            { name: 'Overall', value: `📊 ${String(newPlayer.overall)}`, inline: true },
            { name: 'Position', value: `🎯 ${newPlayer.position}`, inline: true },
            { name: 'Playing Style', value: newPlayer.playingStyle || '—', inline: true },
            { name: 'Skills', value: skills, inline: false },
            { name: 'Stats', value: `Att ${s.attacking || 0} | Drib ${s.dribbling || 0} | Pass ${s.passing || 0} | Def ${s.defending || 0} | Phys ${s.physicality || 0} | GK ${s.goalkeeping || 0}`, inline: false }
          )
          .setFooter({ text: footerText });

        // Don't attach the same gif again for results
        embeds.push(embed);
      });

      client.setUserData(interaction.user.id, userData);

      const packEmoji = PACK_EMOJIS[packName] || '';
      const summary = `${packEmoji} **PACK OPENING COMPLETE!**\nPack: ${pack.name} • Pulls: ${count} • Cost: ${totalCost.toLocaleString()} ${pack.currency}` + 
                     (totalSellBack > 0 ? ` • Duplicate GP earned: ${totalSellBack.toLocaleString()}` : '');

      await interaction.editReply({ 
        content: summary, 
        embeds: embeds, 
        files: [] // Clear animation files
      });

    } catch (err) {
      console.error('contract2 execute error:', err);
      try {
        if (interaction.deferred || interaction.replied) {
          await interaction.editReply({ content: 'There was an error while executing this command!' });
        } else {
          await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
        }
      } catch (e) {
        console.error('Failed to send error message:', e);
      }
    }
  }
};
