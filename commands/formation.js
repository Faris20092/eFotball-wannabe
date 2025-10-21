const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

// Enhanced formation definitions with tactical info
const FORMATIONS = {
    '4-3-3': {
        positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'CMF', 'CMF', 'CMF', 'LWF', 'CF', 'RWF'],
        name: 'Classic 4-3-3',
        style: 'Balanced Attack',
        description: 'Versatile formation with strong wing play and midfield control',
        visual: [
            '      🥅     ',
            '⬅️  🛡️  🛡️  ➡️',
            '  ⚽  ⚽  ⚽  ',
            '🏃    ⚡    🏃'
        ]
    },
    '4-4-2': {
        positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'LMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
        name: 'Traditional 4-4-2',
        style: 'Solid & Direct',
        description: 'Classic formation with two strikers and wide midfield support',
        visual: [
            '      🥅     ',
            '⬅️  🛡️  🛡️  ➡️',
            '⬅️  ⚽  ⚽  ➡️',
            '   ⚡    ⚡   '
        ]
    },
    '3-5-2': {
        positions: ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
        name: 'Dynamic 3-5-2',
        style: 'Wing-Back Focus',
        description: 'Attacking formation with overlapping wing-backs and strong midfield',
        visual: [
            '     🥅      ',
            '  🛡️ 🛡️ 🛡️  ',
            '⬅️ ⚽ ⚽ ⚽ ➡️',
            '   ⚡   ⚡    '
        ]
    },
    '4-2-3-1': {
        positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'DMF', 'AMF', 'AMF', 'AMF', 'CF'],
        name: 'Modern 4-2-3-1',
        style: 'Possession Game',
        description: 'Contemporary formation with defensive midfield shield and attacking creativity',
        visual: [
            '      🥅     ',
            '⬅️  🛡️  🛡️  ➡️',
            '   🔒  🔒   ',
            '🎯   🎯   🎯 ',
            '     ⚡      '
        ]
    },
    '3-4-3': {
        positions: ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'RMF', 'LWF', 'CF', 'RWF'],
        name: 'Attacking 3-4-3',
        style: 'High Pressure',
        description: 'Aggressive formation with three forwards and attacking midfield',
        visual: [
            '     🥅      ',
            '  🛡️ 🛡️ 🛡️  ',
            '⬅️  ⚽  ⚽  ➡️',
            '🏃    ⚡    🏃'
        ]
    },
    '4-1-4-1': {
        positions: ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'LMF', 'CMF', 'CMF', 'RMF', 'CF'],
        name: 'Defensive 4-1-4-1',
        style: 'Counter Attack',
        description: 'Solid defensive setup with quick counter-attacking options',
        visual: [
            '      🥅     ',
            '⬅️  🛡️  🛡️  ➡️',
            '     🔒     ',
            '⬅️ ⚽  ⚽  ➡️',
            '     ⚡      '
        ]
    }
};

const POSITION_EMOJIS = {
    'GK': '🥅', 'CB': '🛡️', 'LB': '⬅️', 'RB': '➡️', 
    'DMF': '🔒', 'CMF': '⚽', 'AMF': '🎯', 'LMF': '⬅️', 'RMF': '➡️',
    'CF': '⚡', 'LWF': '🏃', 'RWF': '🏃'
};

const POSITION_NAMES = {
    'GK': 'Goalkeeper', 'CB': 'Centre Back', 'LB': 'Left Back', 'RB': 'Right Back',
    'DMF': 'Defensive Mid', 'CMF': 'Central Mid', 'AMF': 'Attacking Mid',
    'LMF': 'Left Mid', 'RMF': 'Right Mid', 'CF': 'Centre Forward',
    'LWF': 'Left Wing', 'RWF': 'Right Wing'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('formation')
        .setDescription('Advanced formation and tactical management')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current formation with visual display'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('Show all available formations with tactical info'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('change')
                .setDescription('Change your team formation')
                .addStringOption(option =>
                    option.setName('formation')
                        .setDescription('Select new formation')
                        .setRequired(true)
                        .addChoices(
                            { name: '4-3-3 (Classic)', value: '4-3-3' },
                            { name: '4-4-2 (Traditional)', value: '4-4-2' },
                            { name: '3-5-2 (Dynamic)', value: '3-5-2' },
                            { name: '4-2-3-1 (Modern)', value: '4-2-3-1' },
                            { name: '3-4-3 (Attacking)', value: '3-4-3' },
                            { name: '4-1-4-1 (Defensive)', value: '4-1-4-1' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('analyze')
                .setDescription('Get tactical analysis of your current setup'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('optimize')
                .setDescription('Get formation suggestions based on your players')),

    async execute(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);
        const subcommand = interaction.options.getSubcommand();

        // Initialize formation if not set
        if (!userData.formation) {
            userData.formation = '4-3-3';
            client.setUserData(interaction.user.id, userData);
        }

        switch (subcommand) {
            case 'view':
                await viewFormation(interaction, userData);
                break;
            case 'list':
                await listFormations(interaction);
                break;
            case 'change':
                await changeFormation(interaction, userData, client);
                break;
            case 'analyze':
                await analyzeFormation(interaction, userData);
                break;
            case 'optimize':
                await optimizeFormation(interaction, userData);
                break;
        }
    },
};

async function viewFormation(interaction, userData) {
    const formation = userData.formation || '4-3-3';
    const formationData = FORMATIONS[formation];
    
    if (!userData.squad) {
        userData.squad = { main: new Array(11).fill(null), bench: [] };
    }

    const embed = new EmbedBuilder()
        .setTitle(`⚽ ${formationData.name}`)
        .setColor('#1e90ff')
        .setDescription(`**Style:** ${formationData.style}\n*${formationData.description}*`)
        .setThumbnail(interaction.user.displayAvatarURL());

    // Visual formation display
    const visualField = formationData.visual.join('\n');
    embed.addFields({ 
        name: '🏟️ Formation Layout', 
        value: `\`\`\`\n${visualField}\n\`\`\``, 
        inline: false 
    });

    // Show current players in formation
    const squadDisplay = formationData.positions.map((pos, index) => {
        const playerId = userData.squad.main[index];
        const player = playerId ? userData.players?.find(p => p.id === playerId) : null;
        const emoji = POSITION_EMOJIS[pos];
        const posName = POSITION_NAMES[pos];
        
        if (player) {
            return `${emoji} **${pos}** - ${player.name} (${player.overall})`;
        } else {
            return `${emoji} **${pos}** - *Empty Position*`;
        }
    }).join('\n');

    embed.addFields({ 
        name: '👥 Current Lineup', 
        value: squadDisplay, 
        inline: false 
    });

    // Team statistics
    const filledPositions = userData.squad.main.filter(id => id !== null).length;
    const mainPlayers = userData.squad.main
        .map(id => userData.players?.find(p => p.id === id))
        .filter(Boolean);
    
    const teamOverall = mainPlayers.length > 0 
        ? Math.round(mainPlayers.reduce((sum, p) => sum + p.overall, 0) / mainPlayers.length)
        : 0;

    const chemistry = calculateChemistry(userData, formation);
    
    embed.addFields({ 
        name: '📊 Team Stats', 
        value: `**Players:** ${filledPositions}/11\n**Team Rating:** ${teamOverall}\n**Chemistry:** ${chemistry}/100\n**Formation:** ${formation}`, 
        inline: true 
    });

    embed.setFooter({ text: 'Use /formation change to switch formations or /squad autoset to fill empty positions' });
    
    await interaction.reply({ embeds: [embed] });
}

async function listFormations(interaction) {
    const embed = new EmbedBuilder()
        .setTitle('⚽ Available Formations')
        .setColor('#ff6b35')
        .setDescription('Choose the perfect tactical setup for your team');

    Object.entries(FORMATIONS).forEach(([key, formation]) => {
        const visualMini = formation.visual.slice(0, 2).join('\n'); // Show first 2 lines only
        embed.addFields({
            name: `${formation.name} (${key})`,
            value: `**Style:** ${formation.style}\n*${formation.description}*\n\`\`\`\n${visualMini}\n\`\`\``,
            inline: true
        });
    });

    embed.setFooter({ text: 'Use /formation change <formation> to switch formations' });
    
    await interaction.reply({ embeds: [embed] });
}

async function changeFormation(interaction, userData, client) {
    const newFormation = interaction.options.getString('formation');
    const oldFormation = userData.formation || '4-3-3';
    
    if (newFormation === oldFormation) {
        return await interaction.reply({ 
            content: `❌ You're already using the **${FORMATIONS[newFormation].name}** formation.`, 
            ephemeral: true 
        });
    }

    userData.formation = newFormation;
    client.setUserData(interaction.user.id, userData);
    
    const formationData = FORMATIONS[newFormation];
    const embed = new EmbedBuilder()
        .setTitle('✅ Formation Changed!')
        .setColor('#00ff00')
        .setDescription(`Switched from **${FORMATIONS[oldFormation].name}** to **${formationData.name}**`)
        .addFields(
            { 
                name: '🎯 New Tactical Setup', 
                value: `**Style:** ${formationData.style}\n*${formationData.description}*`, 
                inline: false 
            },
            { 
                name: '🏟️ Formation Layout', 
                value: `\`\`\`\n${formationData.visual.join('\n')}\n\`\`\``, 
                inline: false 
            }
        );

    // Warn about potential player repositioning
    if (userData.squad && userData.squad.main.some(id => id !== null)) {
        embed.addFields({
            name: '⚠️ Important Note',
            value: 'Your current players will remain in their numbered positions, but may need repositioning for optimal chemistry. Use `/squad view` to check your lineup.',
            inline: false
        });
    }

    embed.setFooter({ text: 'Use /formation view to see your current lineup in the new formation' });
    
    await interaction.reply({ embeds: [embed] });
}

async function analyzeFormation(interaction, userData) {
    const formation = userData.formation || '4-3-3';
    const formationData = FORMATIONS[formation];
    
    if (!userData.squad || !userData.players) {
        return await interaction.reply({ 
            content: '❌ You need players and a squad to analyze. Use `/contract` to get players first.', 
            ephemeral: true 
        });
    }

    const mainPlayers = userData.squad.main
        .map(id => userData.players?.find(p => p.id === id))
        .filter(Boolean);

    if (mainPlayers.length === 0) {
        return await interaction.reply({ 
            content: '❌ No players in your starting XI. Use `/squad autoset` to fill your team first.', 
            ephemeral: true 
        });
    }

    // Analyze team composition
    const positionCounts = {};
    const overallsByPosition = {};
    
    formationData.positions.forEach((pos, index) => {
        const player = mainPlayers.find((_, i) => userData.squad.main[i] === mainPlayers[i]?.id);
        if (player) {
            positionCounts[pos] = (positionCounts[pos] || 0) + 1;
            if (!overallsByPosition[pos]) overallsByPosition[pos] = [];
            overallsByPosition[pos].push(player.overall);
        }
    });

    const teamOverall = Math.round(mainPlayers.reduce((sum, p) => sum + p.overall, 0) / mainPlayers.length);
    const chemistry = calculateChemistry(userData, formation);
    
    // Determine strengths and weaknesses
    const strengths = [];
    const weaknesses = [];
    
    // Analyze by formation type
    switch (formation) {
        case '4-3-3':
            if (getPositionAverage(overallsByPosition, 'LWF') > 85 && getPositionAverage(overallsByPosition, 'RWF') > 85) {
                strengths.push('Strong wing attack');
            }
            if (getPositionAverage(overallsByPosition, 'CMF') < 75) {
                weaknesses.push('Weak midfield control');
            }
            break;
        case '4-4-2':
            if (getPositionAverage(overallsByPosition, 'CF') > 85) {
                strengths.push('Powerful strike partnership');
            }
            if (!overallsByPosition['DMF'] || getPositionAverage(overallsByPosition, 'CMF') < 80) {
                weaknesses.push('Lacks midfield depth');
            }
            break;
        case '4-2-3-1':
            if (getPositionAverage(overallsByPosition, 'DMF') > 80) {
                strengths.push('Solid defensive midfield');
            }
            if (getPositionAverage(overallsByPosition, 'AMF') > 85) {
                strengths.push('Creative attacking midfield');
            }
            break;
    }

    // General analysis
    if (teamOverall > 85) strengths.push('High overall team quality');
    if (chemistry > 80) strengths.push('Good team chemistry');
    if (chemistry < 60) weaknesses.push('Poor team chemistry');
    
    const embed = new EmbedBuilder()
        .setTitle(`📊 Tactical Analysis - ${formationData.name}`)
        .setColor('#9966cc')
        .setDescription(`Detailed breakdown of your **${formation}** setup`)
        .addFields(
            {
                name: '📈 Team Statistics',
                value: `**Overall Rating:** ${teamOverall}/100\n**Chemistry:** ${chemistry}/100\n**Players:** ${mainPlayers.length}/11\n**Formation Style:** ${formationData.style}`,
                inline: true
            },
            {
                name: '💪 Strengths',
                value: strengths.length > 0 ? strengths.map(s => `• ${s}`).join('\n') : '• No major strengths identified',
                inline: true
            },
            {
                name: '⚠️ Areas to Improve',
                value: weaknesses.length > 0 ? weaknesses.map(w => `• ${w}`).join('\n') : '• Well-balanced setup',
                inline: true
            }
        );

    // Position-by-position breakdown
    const positionAnalysis = Object.entries(overallsByPosition)
        .map(([pos, ratings]) => {
            const avg = Math.round(ratings.reduce((a, b) => a + b, 0) / ratings.length);
            const grade = avg >= 90 ? 'A+' : avg >= 85 ? 'A' : avg >= 80 ? 'B+' : avg >= 75 ? 'B' : avg >= 70 ? 'C+' : avg >= 65 ? 'C' : 'D';
            return `**${pos}**: ${avg} (${grade})`;
        })
        .join('\n');

    embed.addFields({
        name: '🎯 Position Breakdown',
        value: positionAnalysis || 'No players to analyze',
        inline: false
    });

    embed.setFooter({ text: 'Use /formation optimize for improvement suggestions' });
    
    await interaction.reply({ embeds: [embed] });
}

async function optimizeFormation(interaction, userData) {
    if (!userData.players || userData.players.length < 11) {
        return await interaction.reply({ 
            content: '❌ You need at least 11 players to get formation optimization. Use `/contract` to get more players.', 
            ephemeral: true 
        });
    }

    // Analyze player positions and overall ratings
    const playersByPosition = {};
    userData.players.forEach(player => {
        if (!playersByPosition[player.position]) {
            playersByPosition[player.position] = [];
        }
        playersByPosition[player.position].push(player);
    });

    // Sort players by overall in each position
    Object.keys(playersByPosition).forEach(pos => {
        playersByPosition[pos].sort((a, b) => b.overall - a.overall);
    });

    // Suggest best formations based on player strength
    const suggestions = [];
    
    Object.entries(FORMATIONS).forEach(([formationKey, formationData]) => {
        let score = 0;
        let filledPositions = 0;
        
        formationData.positions.forEach(requiredPos => {
            if (playersByPosition[requiredPos] && playersByPosition[requiredPos].length > 0) {
                score += playersByPosition[requiredPos][0].overall;
                filledPositions++;
            }
        });
        
        // Average score for this formation
        const avgScore = filledPositions > 0 ? score / formationData.positions.length : 0;
        const completeness = (filledPositions / 11) * 100;
        
        suggestions.push({
            formation: formationKey,
            data: formationData,
            score: avgScore,
            completeness,
            totalScore: avgScore * (completeness / 100) // Weight by completeness
        });
    });

    // Sort by total score
    suggestions.sort((a, b) => b.totalScore - a.totalScore);
    const currentFormation = userData.formation || '4-3-3';
    
    const embed = new EmbedBuilder()
        .setTitle('🎯 Formation Optimization')
        .setColor('#ff9500')
        .setDescription(`Based on your ${userData.players.length} players, here are the best tactical setups:`);

    // Show top 3 recommendations
    suggestions.slice(0, 3).forEach((suggestion, index) => {
        const emoji = index === 0 ? '🥇' : index === 1 ? '🥈' : '🥉';
        const isCurrent = suggestion.formation === currentFormation;
        
        embed.addFields({
            name: `${emoji} ${suggestion.data.name}${isCurrent ? ' (Current)' : ''}`,
            value: `**Projected Rating:** ${Math.round(suggestion.score)}/100\n` +
                   `**Squad Completeness:** ${Math.round(suggestion.completeness)}%\n` +
                   `**Style:** ${suggestion.data.style}\n` +
                   `*${suggestion.data.description}*`,
            inline: true
        });
    });

    // Show specific recommendations
    const bestFormation = suggestions[0];
    if (bestFormation.formation !== currentFormation) {
        embed.addFields({
            name: '💡 Recommendation',
            value: `Consider switching to **${bestFormation.data.name}** for a **${Math.round(bestFormation.score - calculateCurrentTeamRating(userData))}** point improvement in team rating!`,
            inline: false
        });
    } else {
        embed.addFields({
            name: '✅ Current Setup',
            value: `Your **${FORMATIONS[currentFormation].name}** is already optimal for your current squad!`,
            inline: false
        });
    }

    embed.setFooter({ text: 'Use /formation change <formation> to switch tactical setups' });
    
    await interaction.reply({ embeds: [embed] });
}

// Helper functions
function getPositionAverage(overallsByPosition, position) {
    if (!overallsByPosition[position]) return 0;
    return overallsByPosition[position].reduce((a, b) => a + b, 0) / overallsByPosition[position].length;
}

function calculateChemistry(userData, formation) {
    if (!userData.squad || !userData.players) return 0;
    
    const formationData = FORMATIONS[formation];
    let chemistryScore = 0;
    let playerCount = 0;
    
    userData.squad.main.forEach((playerId, index) => {
        if (playerId) {
            const player = userData.players.find(p => p.id === playerId);
            const requiredPosition = formationData.positions[index];
            
            if (player) {
                playerCount++;
                // Perfect match: 100 points
                if (player.position === requiredPosition) {
                    chemistryScore += 100;
                } else {
                    // Partial match based on compatibility
                    const compatibility = getPositionCompatibility(player.position, requiredPosition);
                    chemistryScore += compatibility;
                }
            }
        }
    });
    
    return playerCount > 0 ? Math.round(chemistryScore / playerCount) : 0;
}

function getPositionCompatibility(playerPos, requiredPos) {
    // Compatibility matrix - how well each position fits in another
    const compatibility = {
        'GK': { 'GK': 100 }, // GK only fits GK
        'CB': { 'CB': 100, 'LB': 70, 'RB': 70, 'DMF': 60 },
        'LB': { 'LB': 100, 'CB': 70, 'LMF': 80, 'LWF': 60 },
        'RB': { 'RB': 100, 'CB': 70, 'RMF': 80, 'RWF': 60 },
        'DMF': { 'DMF': 100, 'CMF': 85, 'CB': 60 },
        'CMF': { 'CMF': 100, 'DMF': 85, 'AMF': 80 },
        'AMF': { 'AMF': 100, 'CMF': 80, 'CF': 70 },
        'LMF': { 'LMF': 100, 'LB': 80, 'LWF': 85, 'CMF': 70 },
        'RMF': { 'RMF': 100, 'RB': 80, 'RWF': 85, 'CMF': 70 },
        'CF': { 'CF': 100, 'AMF': 70, 'LWF': 60, 'RWF': 60 },
        'LWF': { 'LWF': 100, 'CF': 60, 'LMF': 85 },
        'RWF': { 'RWF': 100, 'CF': 60, 'RMF': 85 }
    };
    
    return compatibility[playerPos]?.[requiredPos] || 30; // Default low compatibility
}

function calculateCurrentTeamRating(userData) {
    if (!userData.squad || !userData.players) return 0;
    
    const mainPlayers = userData.squad.main
        .map(id => userData.players?.find(p => p.id === id))
        .filter(Boolean);
    
    return mainPlayers.length > 0 
        ? Math.round(mainPlayers.reduce((sum, p) => sum + p.overall, 0) / mainPlayers.length)
        : 0;
}