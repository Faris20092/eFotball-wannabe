const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Helper function to get player face image
function getPlayerFace(playerName) {
    // Sanitize player name for filename
    const baseSanitized = playerName.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase();
    // Additional normalizations: collapse multiple underscores and trim trailing underscores
    const collapsed = baseSanitized.replace(/_+/g, '_');
    const trimmed = collapsed.replace(/_+$/g, '');

    const candidates = Array.from(new Set([
        baseSanitized,
        collapsed,
        trimmed,
    ])).filter(Boolean);

    for (const name of candidates) {
        const jpg = path.join(__dirname, '..', 'assets', 'faces', `${name}.jpg`);
        if (fs.existsSync(jpg)) {
            return { type: 'attachment', filename: `${name}.jpg`, filePath: jpg };
        }
        const png = path.join(__dirname, '..', 'assets', 'faces', `${name}.png`);
        if (fs.existsSync(png)) {
            return { type: 'attachment', filename: `${name}.png`, filePath: png };
        }
    }
    
    // Default placeholder if no face found
    const defaultPath = path.join(__dirname, '..', 'assets', 'faces', 'default_player.png');
    if (fs.existsSync(defaultPath)) {
        return { type: 'attachment', filename: 'default_player.png', filePath: defaultPath };
    }
    
    return null;
}

// Updated Training Configuration
const TRAINER_TYPES = {
    'normal': {
        name: 'Normal Trainer',
        cost: 1500,
        currency: 'GP',
        expGain: 500,
        description: 'Gives 500 EXP to a player'
    },
    'basic': {
        name: 'Basic Trainer',
        cost: 3000,
        currency: 'GP',
        expGain: 1000,
        description: 'Gives 1,000 EXP to a player'
    },
    'special': {
        name: 'Special Trainer',
        cost: 28000,
        currency: 'GP',
        expGain: 10000,
        description: 'Gives 10,000 EXP to a player'
    },
    'special_coin': {
        name: 'Special Trainer (eCoin)',
        cost: 50,
        currency: 'eCoins',
        expGain: 10000,
        description: 'Gives 10,000 EXP to a player'
    }
};
// Player conversion EXP based on rarity
const CONVERSION_EXP = {
    'Iconic': { min: 7500, max: 9000 },
    'Legend': { min: 6000, max: 7500 },
    'Black': { min: 4500, max: 6000 },
    'Gold': { min: 3000, max: 4500 },
    'Silver': { min: 2000, max: 3000 },
    'Bronze': { min: 1200, max: 2000 },
    'White': { min: 800, max: 1200 }
};

// Level and EXP system
const LEVEL_CONFIG = {
    maxLevel: 50,
    expPerLevel: 1000, // Base EXP needed per level
    expMultiplier: 1.1 // Each level requires 10% more EXP
};

// Rarity-based max level and stat multipliers
const RARITY_CONFIG = {
    'Iconic': { maxLevel: 50, statMultiplier: 1.0, overallBonus: 0 },
    'Legend': { maxLevel: 45, statMultiplier: 0.95, overallBonus: -2 },
    'Black': { maxLevel: 40, statMultiplier: 0.90, overallBonus: -5 },
    'Gold': { maxLevel: 35, statMultiplier: 0.85, overallBonus: -8 },
    'Silver': { maxLevel: 30, statMultiplier: 0.80, overallBonus: -12 },
    'Bronze': { maxLevel: 25, statMultiplier: 0.75, overallBonus: -16 },
    'White': { maxLevel: 20, statMultiplier: 0.70, overallBonus: -20 }
};

// Position-based stat growth priorities
const POSITION_STAT_PRIORITY = {
    'GK': { goalkeeping: 2.0, defending: 1.2, physicality: 1.1, passing: 0.8, attacking: 0.3, dribbling: 0.4 },
    'CB': { defending: 1.8, physicality: 1.5, passing: 1.0, goalkeeping: 0.1, attacking: 0.4, dribbling: 0.5 },
    'LB': { defending: 1.4, passing: 1.3, physicality: 1.1, dribbling: 1.0, attacking: 0.8, goalkeeping: 0.1 },
    'RB': { defending: 1.4, passing: 1.3, physicality: 1.1, dribbling: 1.0, attacking: 0.8, goalkeeping: 0.1 },
    'DMF': { defending: 1.5, passing: 1.4, physicality: 1.2, dribbling: 0.9, attacking: 0.7, goalkeeping: 0.1 },
    'CMF': { passing: 1.6, dribbling: 1.3, defending: 1.0, physicality: 1.0, attacking: 1.1, goalkeeping: 0.1 },
    'AMF': { passing: 1.5, dribbling: 1.4, attacking: 1.3, physicality: 0.8, defending: 0.6, goalkeeping: 0.1 },
    'LMF': { dribbling: 1.4, passing: 1.3, attacking: 1.1, physicality: 1.0, defending: 0.8, goalkeeping: 0.1 },
    'RMF': { dribbling: 1.4, passing: 1.3, attacking: 1.1, physicality: 1.0, defending: 0.8, goalkeeping: 0.1 },
    'LWF': { dribbling: 1.5, attacking: 1.4, passing: 1.0, physicality: 0.9, defending: 0.5, goalkeeping: 0.1 },
    'RWF': { dribbling: 1.5, attacking: 1.4, passing: 1.0, physicality: 0.9, defending: 0.5, goalkeeping: 0.1 },
    'SS': { attacking: 1.6, dribbling: 1.4, passing: 1.2, physicality: 1.0, defending: 0.4, goalkeeping: 0.1 },
    'CF': { attacking: 1.8, physicality: 1.3, dribbling: 1.1, passing: 1.0, defending: 0.3, goalkeeping: 0.1 }
};

// Playing style bonuses
const PLAYSTYLE_BONUSES = {
    'Offensive Wingback': { attacking: 1.2, dribbling: 1.1 },
    'Classic No. 10': { passing: 1.3, dribbling: 1.2 },
    'Box-to-Box': { physicality: 1.2, passing: 1.1 },
    'Destroyer': { defending: 1.3, physicality: 1.2 },
    'Orchestrator': { passing: 1.4, dribbling: 1.1 },
    'Hole Player': { attacking: 1.2, dribbling: 1.2 },
    'Roaming Flank': { dribbling: 1.3, attacking: 1.1 },
    'Cross Specialist': { passing: 1.2, attacking: 1.1 },
    'Prolific Winger': { dribbling: 1.4, attacking: 1.2 },
    'Goal Poacher': { attacking: 1.5 },
    'Target Man': { physicality: 1.4, attacking: 1.2 },
    'Deep-lying Forward': { passing: 1.3, attacking: 1.1 }
};

function calculateExpNeeded(level) {
    if (level >= LEVEL_CONFIG.maxLevel) return 0;
    return Math.floor(LEVEL_CONFIG.expPerLevel * Math.pow(LEVEL_CONFIG.expMultiplier, level - 1));
}

function calculateOverall(stats, position, playingStyle) {
    // Weight stats based on position importance
    const positionPriority = POSITION_STAT_PRIORITY[position] || POSITION_STAT_PRIORITY['CMF'];
    
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (const [statName, statValue] of Object.entries(stats)) {
        if (statName === 'goalkeeping' && position !== 'GK') {
            continue; // Skip GK stat for outfield players
        }
        const weight = positionPriority[statName] || 1.0;
        weightedSum += statValue * weight;
        totalWeight += weight;
    }
    
    const weightedAvg = totalWeight > 0 ? weightedSum / totalWeight : 50;
    return Math.max(30, Math.min(99, Math.round(weightedAvg)));
}

function calculateStatsForLevel(baseStats, position, playingStyle, level, maxLevel, rarity) {
    const positionPriority = POSITION_STAT_PRIORITY[position] || POSITION_STAT_PRIORITY['CMF'];
    const styleBonuses = PLAYSTYLE_BONUSES[playingStyle] || {};
    
    const levelProgress = (level - 1) / (maxLevel - 1);
    const newStats = {};
    
    for (const [statName, baseStat] of Object.entries(baseStats)) {
        const positionMultiplier = positionPriority[statName] || 1.0;
        const styleMultiplier = styleBonuses[statName] || 1.0;
        
        const maxGrowth = 15;
        const growth = levelProgress * maxGrowth * positionMultiplier * styleMultiplier;
        newStats[statName] = Math.max(10, Math.min(99, Math.floor(baseStat + growth)));
    }
    
    return newStats;
}

function initializePlayerLevel(player) {
    const rarityConfig = RARITY_CONFIG[player.rarity] || RARITY_CONFIG['White'];
    
    if (!player.level) {
        player.level = 1;
        player.exp = 0;
        player.maxLevel = rarityConfig.maxLevel;
        player.baseStats = { ...player.stats };
        // Recalculate overall to match current stats
        player.overall = calculateOverall(player.stats, player.position, player.playingStyle);
    }
    
    return player;
}

function getConversionExp(rarity) {
    const expRange = CONVERSION_EXP[rarity] || CONVERSION_EXP['White'];
    return Math.floor(Math.random() * (expRange.max - expRange.min + 1)) + expRange.min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('training')
        .setDescription('Train your players to increase their level and stats')
        .addSubcommand(subcommand =>
            subcommand
                .setName('player')
                .setDescription('Train a specific player')
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name to train')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addStringOption(option =>
                    option.setName('trainer')
                        .setDescription('Trainer to use (standard or your player trainers)')
                        .setRequired(true)
                        .setAutocomplete(true))
                .addIntegerOption(option =>
                    option.setName('amount')
                        .setDescription('Number of trainers to use')
                        .setMinValue(1)
                        .setMaxValue(10)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('convert')
                .setDescription('Convert a player to training EXP')
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name to convert')
                        .setRequired(true)
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View training information and player levels')
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name to view info')
                        .setAutocomplete(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Buy training items')),

    async execute(interaction) {
        try {
            const { client } = interaction;
            const userData = client.getUserData(interaction.user.id);
            const subcommand = interaction.options.getSubcommand();

            // Ensure user has players array and training inventory
            if (!userData.players) userData.players = [];
            if (!Array.isArray(userData.playerTrainers)) userData.playerTrainers = [];
            if (!userData.trainingExp) userData.trainingExp = 0;

            if (subcommand === 'player') {
                await this.handleTrainPlayer(interaction, userData, client);
            } else if (subcommand === 'convert') {
                await this.handleConvertPlayer(interaction, userData, client);
            } else if (subcommand === 'info') {
                await this.handleTrainingInfo(interaction, userData);
            } else if (subcommand === 'shop') {
                await this.handleTrainingShop(interaction, userData, client);
            }
        } catch (error) {
            console.error('Training command error:', error);
            try { 
                await interaction.reply({ content: '❌ Error executing training command. Please try again!', ephemeral: true }); 
            } catch {}
        }
    },

    async handleTrainPlayer(interaction, userData, client) {
        const playerName = interaction.options.getString('player');
        const trainerInput = interaction.options.getString('trainer');
        const amount = interaction.options.getInteger('amount') || 1;

        // Find player
        const player = userData.players.find(p => 
            p.name.toLowerCase().includes(playerName.toLowerCase())
        );

        if (!player) {
            return await interaction.reply({ 
                content: `❌ Player "${playerName}" not found in your collection!`, 
                ephemeral: true 
            });
        }

        // Initialize player level if needed
        initializePlayerLevel(player);

        // Check if player is max level
        if (player.level >= player.maxLevel) {
            return await interaction.reply({ 
                content: `❌ ${player.name} is already at max level (${player.maxLevel})!`, 
                ephemeral: true 
            });
        }

        let totalCost = 0;
        let totalExp = 0;
        let currency = 'GP';
        let trainersUsedDescription = '';

        // Case 1: player trainer selected (value format: player:<token>)
        if (trainerInput && trainerInput.startsWith('player:')) {
            const token = trainerInput.split(':')[1];
            const idx = Array.isArray(userData.playerTrainers) ? userData.playerTrainers.findIndex(t => t.token === token) : -1;
            if (idx === -1) {
                return await interaction.reply({ content: '❌ That player trainer is no longer available.', ephemeral: true });
            }
            const trainerItem = userData.playerTrainers[idx];
            // Player trainers are single-use; ignore amount and apply exactly once
            totalExp = Number(trainerItem.exp || 0);
            totalCost = 0; // already paid at conversion time
            currency = 'GP';
            trainersUsedDescription = `Player Trainer: ${trainerItem.name} (+${totalExp.toLocaleString()} EXP)`;
            // consume it
            userData.playerTrainers.splice(idx, 1);
        } else {
            // Case 2: standard trainer type
            const trainer = TRAINER_TYPES[trainerInput];
            if (!trainer) {
                return await interaction.reply({ content: '❌ Invalid trainer selected.', ephemeral: true });
            }
            totalCost = trainer.cost * amount;
            totalExp = trainer.expGain * amount;
            currency = trainer.currency;
            trainersUsedDescription = `${trainer.name} ×${amount} (+${totalExp.toLocaleString()} EXP)`;
            // Check currency
            if (currency === 'GP' && userData.gp < totalCost) {
                return await interaction.reply({ 
                    content: `❌ You need ${totalCost.toLocaleString()} GP but only have ${userData.gp.toLocaleString()} GP!`, 
                    ephemeral: true 
                });
            } else if (currency === 'eCoins' && userData.eCoins < totalCost) {
                return await interaction.reply({ 
                    content: `❌ You need ${totalCost} eCoins but only have ${userData.eCoins} eCoins!`, 
                    ephemeral: true 
                });
            }
        }

        await interaction.deferReply();

        // Deduct currency
        if (totalCost > 0) {
            if (currency === 'GP') userData.gp -= totalCost; else userData.eCoins -= totalCost;
        }

        // Apply EXP and level up
        const oldLevel = player.level;
        const oldOverall = player.overall;
        const statsBefore = { ...(player.stats || {}) };
        player.exp += totalExp;

        let levelsGained = 0;
        while (player.level < player.maxLevel) {
            const expNeeded = calculateExpNeeded(player.level);
            if (player.exp >= expNeeded) {
                player.exp -= expNeeded;
                player.level++;
                levelsGained++;
                
                // Update stats and overall for new level
                const baseStats = player.baseStats || player.stats;
                player.stats = calculateStatsForLevel(
                    baseStats, 
                    player.position, 
                    player.playingStyle, 
                    player.level, 
                    player.maxLevel, 
                    player.rarity
                );
                // Clamp to maxStats if available to avoid current > max
                if (player.maxStats) {
                    for (const key of Object.keys(player.stats)) {
                        const maxVal = typeof player.maxStats[key] === 'number' ? player.maxStats[key] : 99;
                        if (player.stats[key] > maxVal) player.stats[key] = maxVal;
                    }
                }
                const baseOverall = calculateOverall(player.stats, player.position, player.playingStyle);
                // Blend toward maxOverall based on level progress so overall can exceed 99 safely
                let blendedOverall = baseOverall;
                if (typeof player.maxOverall === 'number') {
                    const progress = player.maxLevel > 1 ? (player.level - 1) / (player.maxLevel - 1) : 1;
                    blendedOverall = Math.round(baseOverall + (player.maxOverall - baseOverall) * progress);
                    // Do not exceed declared cap
                    blendedOverall = Math.min(blendedOverall, player.maxOverall);
                }
                // Ensure overall never decreases
                player.overall = Math.max(oldOverall, blendedOverall);
            } else {
                break;
            }
        }

        client.setUserData(interaction.user.id, userData);

        // Create result embed
        const embed = new EmbedBuilder()
            .setTitle('🏋️ Training Complete!')
            .setColor('#27ae60')
            .setDescription(`**${player.name}** has been trained!`)
            .addFields(
                { name: '📊 EXP Gained', value: `+${totalExp.toLocaleString()}` , inline: true },
                { name: '⭐ Level', value: `${oldLevel} → ${player.level}`, inline: true },
                { name: '🎯 Overall', value: `${oldOverall} → ${player.overall}${player.maxOverall ? `/${player.maxOverall}` : ''}` , inline: true }
            );
        // Show stat upgrades
        const labelMap = {
            attacking: 'Att',
            dribbling: 'Drib',
            defending: 'Def',
            passing: 'Pass',
            physicality: 'Phys',
            goalkeeping: 'GK',
        };
        const statLines = [];
        for (const [k, vAfter] of Object.entries(player.stats || {})) {
            const before = typeof statsBefore[k] === 'number' ? statsBefore[k] : vAfter;
            if (typeof vAfter === 'number' && vAfter > before) {
                const label = labelMap[k] || k;
                statLines.push(`${label}: ${before} → ${vAfter}`);
            }
        }
        if (statLines.length > 0) {
            embed.addFields({ name: '📈 Stat Upgrades', value: statLines.join('\n') });
        }
        if (trainersUsedDescription) {
            embed.addFields({ name: '🧑‍🏫 Trainer Used', value: trainersUsedDescription });
        }

        if (levelsGained > 0) {
            embed.addFields({ 
                name: '🎉 Level Up!', 
                value: `${player.name} gained ${levelsGained} level${levelsGained > 1 ? 's' : ''}!` 
            });
        }

        const expNeeded = player.level >= player.maxLevel ? 0 : calculateExpNeeded(player.level);
        embed.setFooter({ 
            text: `EXP: ${player.exp}/${expNeeded} | Max Level: ${player.maxLevel}` 
        });

        await interaction.editReply({ embeds: [embed] });
    },

    async handleConvertPlayer(interaction, userData, client) {
        const playerName = interaction.options.getString('player');

        // Find player
        const playerIndex = userData.players.findIndex(p => 
            p.name.toLowerCase().includes(playerName.toLowerCase())
        );

        if (playerIndex === -1) {
            return await interaction.reply({ 
                content: `❌ Player "${playerName}" not found in your collection!`, 
                ephemeral: true 
            });
        }

        const player = userData.players[playerIndex];
        const conversionExp = getConversionExp(player.rarity);

        // Create confirmation embed
        const embed = new EmbedBuilder()
            .setTitle('⚠️ Convert Player to Training EXP')
            .setColor('#e67e22')
            .setDescription(`Are you sure you want to convert **${player.name}** to training EXP?`)
            .addFields(
                { name: '🏆 Player Rarity', value: player.rarity, inline: true },
                { name: '🎯 Player Overall', value: player.overall.toString(), inline: true },
                { name: '📊 EXP Gained', value: `${conversionExp.toLocaleString()}`, inline: true },
                { name: '⚠️ Warning', value: '**This action cannot be undone!** The player will be permanently removed from your collection.', inline: false }
            );

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('confirm_convert')
                    .setLabel('Confirm Convert')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId('cancel_convert')
                    .setLabel('Cancel')
                    .setStyle(ButtonStyle.Secondary)
            );

        const response = await interaction.reply({ 
            embeds: [embed], 
            components: [row], 
            ephemeral: true 
        });

        try {
            const confirmation = await response.awaitMessageComponent({ 
                filter: i => i.user.id === interaction.user.id, 
                time: 30000 
            });

            if (confirmation.customId === 'confirm_convert') {
                // Remove player and create a player trainer item
                userData.players.splice(playerIndex, 1);
                if (!Array.isArray(userData.playerTrainers)) userData.playerTrainers = [];
                const token = Math.random().toString(36).slice(2, 10);
                userData.playerTrainers.push({
                    token,
                    playerId: player.id,
                    name: player.name,
                    rarity: player.rarity,
                    exp: conversionExp,
                    createdAt: Date.now()
                });

                client.setUserData(interaction.user.id, userData);

                const successEmbed = new EmbedBuilder()
                    .setTitle('✅ Player Converted!')
                    .setColor('#27ae60')
                    .setDescription(`**${player.name}** has been converted to a Player Trainer item!`)
                    .addFields(
                        { name: '🧑‍🏫 Trainer', value: `${player.name} — ${player.rarity}`, inline: true },
                        { name: '📊 EXP Value', value: `+${conversionExp.toLocaleString()}`, inline: true },
                        { name: 'How to use', value: 'Use `/training player` and select the trainer option, then pick your Player Trainer from the list.' }
                    );

                await confirmation.update({ embeds: [successEmbed], components: [] });
            } else {
                await confirmation.update({ 
                    content: '❌ Player conversion cancelled.', 
                    embeds: [], 
                    components: [] 
                });
            }
        } catch (error) {
            await interaction.editReply({ 
                content: '⏰ Conversion timed out. Player was not converted.', 
                embeds: [], 
                components: [] 
            });
        }
    },

    async handleTrainingInfo(interaction, userData) {
        const playerName = interaction.options.getString('player');

        if (playerName) {
            // Show specific player info
            const player = userData.players.find(p => 
                p.name.toLowerCase().includes(playerName.toLowerCase())
            );

            if (!player) {
                return await interaction.reply({ 
                    content: `❌ Player "${playerName}" not found in your collection!`, 
                    ephemeral: true 
                });
            }

            initializePlayerLevel(player);

            const expNeeded = player.level >= player.maxLevel ? 0 : calculateExpNeeded(player.level);
            const progressBar = this.createProgressBar(player.exp, expNeeded);
            const conversionExp = getConversionExp(player.rarity);

            const embed = new EmbedBuilder()
                .setTitle(`🏋️ Training Info: ${player.name}`)
                .setColor('#3498db')
                .setDescription(`Level ${player.level}/${player.maxLevel} • Overall: ${player.overall}`)
                .addFields(
                    { name: '🎯 Position', value: player.position, inline: true },
                    { name: '⭐ Rarity', value: player.rarity, inline: true },
                    { name: '🎪 Playing Style', value: player.playingStyle || 'None', inline: true },
                    { name: '📈 EXP Progress', value: `${player.exp}/${expNeeded} (${this.createProgressBar(player.exp, expNeeded)})`, inline: false }
                );

            // Add player face as thumbnail
            const playerFace = getPlayerFace(player.name);
            let files = [];
            if (playerFace) {
                embed.setThumbnail(`attachment://${playerFace.filename}`);
                files.push(playerFace.filePath);
            }

            embed.addFields({ name: '🔄 Conversion Value', value: `${conversionExp.toLocaleString()} EXP`, inline: true });

            // Always show stats 
            let statDisplay = '';
            for (const [statName, currentStat] of Object.entries(player.stats)) {
                if (player.level >= player.maxLevel) {
                    statDisplay += `${statName}: ${currentStat}\n`;
                } else {
                    const maxStats = calculateStatsForLevel(
                        player.maxStats, 
                        player.position, 
                        player.playingStyle, 
                        player.maxLevel, 
                        player.maxLevel, 
                        player.rarity
                    );
                    const maxStat = maxStats[statName];
                    statDisplay += `${statName}: ${currentStat}/${maxStat}\n`;
                }
            }

            const statFieldName = player.level >= player.maxLevel ? '📊 Player Stats' : '📊 Stats (Current/Max)';
            embed.addFields({ name: statFieldName, value: statDisplay, inline: true });

            await interaction.reply({ embeds: [embed], files });
        } else {
            // Show training overview
            const trainablePlayers = userData.players.filter(p => {
                initializePlayerLevel(p);
                return p.level < p.maxLevel;
            }).slice(0, 10);

            const embed = new EmbedBuilder()
                .setTitle('🏋️ Training Center')
                .setColor('#f39c12')
                .setDescription('Your trainable players and training options')
                .addFields(
                    { name: '💼 Training EXP', value: `${userData.trainingExp || 0} EXP available`, inline: true }
                );

            if (trainablePlayers.length > 0) {
                const playerList = trainablePlayers.map(p => {
                    const expNeeded = calculateExpNeeded(p.level);
                    return `**${p.name}** - Lv.${p.level}/${p.maxLevel} (${p.exp}/${expNeeded} EXP)`;
                }).join('\n');

                embed.addFields({ name: '📋 Trainable Players', value: playerList });
            } else {
                embed.addFields({ name: '📋 Trainable Players', value: 'All your players are at max level!' });
            }

            // Add trainer info
            let trainerInfo = '';
            for (const [key, trainer] of Object.entries(TRAINER_TYPES)) {
                trainerInfo += `**${trainer.name}**\n`;
                trainerInfo += `Cost: ${trainer.cost.toLocaleString()} ${trainer.currency}\n`;
                trainerInfo += `EXP: +${trainer.expGain.toLocaleString()}\n\n`;
            }

            embed.addFields({ name: '🎯 Available Trainers', value: trainerInfo });

            await interaction.reply({ embeds: [embed] });
        }
    },

    async handleTrainingShop(interaction, userData, client) {
        const embed = new EmbedBuilder()
            .setTitle('🏪 Training Shop')
            .setColor('#e74c3c')
            .setDescription('Purchase training items to level up your players!')
            .addFields(
                { 
                    name: '💰 Your Currency', 
                    value: `GP: ${userData.gp.toLocaleString()}\neCoins: ${userData.eCoins}\nTraining EXP: ${userData.trainingExp || 0}`, 
                    inline: true 
                }
            );

        let shopItems = '';
        for (const [key, trainer] of Object.entries(TRAINER_TYPES)) {
            shopItems += `**${trainer.name}**\n`;
            shopItems += `${trainer.description}\n`;
            shopItems += `Cost: ${trainer.cost.toLocaleString()} ${trainer.currency}\n\n`;
        }

        embed.addFields({ name: '🛒 Available Items', value: shopItems });
        embed.addFields({ 
            name: '🔄 Player Conversion', 
            value: 'Convert unwanted players to training EXP!\nUse `/training convert` to convert a player.' 
        });
        embed.setFooter({ text: 'Use /training player to train your players!' });

        await interaction.reply({ embeds: [embed] });
    },

    createProgressBar(current, max, length = 10) {
        if (max === 0) return '█'.repeat(length) + ' MAX';
        const progress = Math.min(current / max, 1);
        const filled = Math.floor(progress * length);
        const empty = length - filled;
        return '█'.repeat(filled) + '░'.repeat(empty) + ` ${Math.floor(progress * 100)}%`;
    },

    async autocomplete(interaction) {
        const focusedOption = interaction.options.getFocused(true);
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);

        if (focusedOption.name === 'player' && userData.players) {
            const subcommand = interaction.options.getSubcommand();
            
            let filtered;
            if (subcommand === 'convert') {
                // For conversion, show all players with their conversion value
                filtered = userData.players
                    .filter(player => 
                        player.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                    )
                    .slice(0, 25)
                    .map(player => {
                        const conversionExp = getConversionExp(player.rarity);
                        return {
                            name: `${player.name} - ${player.rarity} (${conversionExp} EXP)`,
                            value: player.name
                        };
                    });
            } else {
                // For training, show players with level info
                filtered = userData.players
                    .filter(player => 
                        player.name.toLowerCase().includes(focusedOption.value.toLowerCase())
                    )
                    .slice(0, 25)
                    .map(player => ({
                        name: `${player.name} (Lv.${player.level || 1}/${player.maxLevel || 20}) - ${player.rarity}`,
                        value: player.name
                    }));
            }

            await interaction.respond(filtered);
        } else if (focusedOption.name === 'trainer') {
            // Trainer autocomplete: include standard trainer types first, then player's own trainers
            const query = String(focusedOption.value || '').toLowerCase();

            const standard = Object.entries(TRAINER_TYPES).map(([key, t]) => ({
                name: `${t.name} — Cost: ${t.cost.toLocaleString()} ${t.currency} — +${t.expGain.toLocaleString()} EXP`,
                value: key
            }));

            const playerTrainers = (userData.playerTrainers || []).map(pt => ({
                name: `Player Trainer: ${pt.name} (${pt.rarity}) — +${pt.exp.toLocaleString()} EXP`,
                value: `player:${pt.token}`
            }));

            const merged = [...standard, ...playerTrainers]
                .filter(opt => opt.name.toLowerCase().includes(query))
                .slice(0, 25);

            await interaction.respond(merged);
        }
    }
};