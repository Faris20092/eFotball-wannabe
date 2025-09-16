const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

const FORMATION_POSITIONS = {
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CMF', 'CMF', 'CMF', 'LWF', 'CF', 'RWF'],
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'DMF', 'AMF', 'AMF', 'AMF', 'CF']
};

const POSITION_EMOJIS = {
    'GK': '🥅', 'CB': '🛡️', 'LB': '⬅️', 'RB': '➡️', 
    'DMF': '🔒', 'CMF': '⚽', 'AMF': '🎯', 'LMF': '⬅️', 'RMF': '➡️',
    'CF': '⚡', 'LWF': '🏃', 'RWF': '🏃'
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('squad')
        .setDescription('Manage your squad and formations')
        .addSubcommand(subcommand =>
            subcommand
                .setName('view')
                .setDescription('View your current squad'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('autoset')
                .setDescription('Automatically set best XI by position and fill the bench'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set')
                .setDescription('Set a player in your squad')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Position number (1-11)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(11))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a player from your squad')
                .addIntegerOption(option =>
                    option.setName('position')
                        .setDescription('Position number (1-11)')
                        .setRequired(true)
                        .setMinValue(1)
                        .setMaxValue(11)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('formation')
                .setDescription('Change your team formation')
                .addStringOption(option =>
                    option.setName('formation')
                        .setDescription('Choose formation')
                        .setRequired(true)
                        .addChoices(
                            { name: '4-3-3', value: '4-3-3' },
                            { name: '4-4-2', value: '4-4-2' },
                            { name: '3-5-2', value: '3-5-2' },
                            { name: '4-2-3-1', value: '4-2-3-1' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('bench')
                .setDescription('Manage bench players')
                .addStringOption(option =>
                    option.setName('action')
                        .setDescription('Add or remove from bench')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Add', value: 'add' },
                            { name: 'Remove', value: 'remove' }
                        ))
                .addStringOption(option =>
                    option.setName('player')
                        .setDescription('Player name')
                        .setRequired(true))),
    async execute(interaction) {
        const { client } = interaction;
        const userData = client.getUserData(interaction.user.id);
        
        // Initialize squad structure if it doesn't exist
        if (!userData.squad) {
            userData.squad = { main: new Array(11).fill(null), bench: [] };
            client.setUserData(interaction.user.id, userData);
        }
        
        const subcommand = interaction.options.getSubcommand();

        switch (subcommand) {
            case 'view':
                await showSquad(interaction, userData);
                break;
            case 'autoset':
                await autosetSquad(interaction, userData, client);
                break;
            case 'set':
                await setPlayer(interaction, userData, client);
                break;
            case 'remove':
                await removePlayer(interaction, userData, client);
                break;
            case 'formation':
                await setFormation(interaction, userData, client);
                break;
            case 'bench':
                await manageBench(interaction, userData, client);
                break;
        }
    },
};

async function showSquad(interaction, userData) {
    const embed = new EmbedBuilder()
        .setTitle(`⚽ ${interaction.user.username}'s Squad`)
        .setColor('#00ff00')
        .setThumbnail(interaction.user.displayAvatarURL());

    const formation = userData.formation || '4-3-3';
    const requiredPositions = FORMATION_POSITIONS[formation];
    
    // Calculate team overall
    const mainPlayers = userData.squad.main
        .map(playerId => userData.players?.find(p => p.id === playerId))
        .filter(Boolean);
    
    const teamOverall = mainPlayers.length > 0 
        ? Math.round(mainPlayers.reduce((sum, p) => sum + p.overall, 0) / mainPlayers.length)
        : 0;

    embed.addFields({ 
        name: 'Formation & Team Rating', 
        value: `**${formation}** | Team Overall: **${teamOverall}**`, 
        inline: false 
    });

    // Show main squad with better formatting
    if (userData.squad.main.some(id => id !== null)) {
        const mainSquad = userData.squad.main
            .map((playerId, index) => {
                const player = userData.players?.find(p => p.id === playerId);
                const position = requiredPositions[index] || 'SUB';
                const emoji = POSITION_EMOJIS[position] || '⚽';
                
                if (player) {
                    return `${emoji} ${position}: **${player.name}** (${player.overall})`;
                } else {
                    return `${emoji} ${position}: *Empty*`;
                }
            })
            .join('\n');
        embed.addFields({ name: '🏟️ Starting XI', value: mainSquad, inline: false });
    } else {
        embed.addFields({ name: '🏟️ Starting XI', value: '*No players set - Use `/squad autoset` to fill automatically*', inline: false });
    }

    // Show bench with better formatting
    if (userData.squad.bench.length > 0) {
        const bench = userData.squad.bench
            .map((playerId, index) => {
                const player = userData.players?.find(p => p.id === playerId);
                return player ? `${index + 1}. **${player.name}** (${player.overall})` : `${index + 1}. *Unknown Player*`;
            })
            .join('\n');
        embed.addFields({ name: '🪑 Bench Players', value: bench, inline: false });
    } else {
        embed.addFields({ name: '🪑 Bench Players', value: '*No bench players*', inline: false });
    }

    embed.setFooter({ text: 'Use /squad set to manually set players or /squad autoset for automatic setup' });
    
    await interaction.reply({ embeds: [embed] });
}

async function setPlayer(interaction, userData, client) {
    const position = interaction.options.getInteger('position') - 1;
    const playerName = interaction.options.getString('player').toLowerCase();

    if (!userData.players || userData.players.length === 0) {
        return await interaction.reply({ content: '❌ You have no players. Use `/contract` to obtain players first.', ephemeral: true });
    }

    // Find the player with fuzzy matching
    const player = userData.players.find(p => 
        p.name.toLowerCase().includes(playerName) || 
        p.name.toLowerCase().startsWith(playerName)
    );

    if (!player) {
        return await interaction.reply({ content: `❌ Player "${playerName}" not found in your collection.`, ephemeral: true });
    }

    // Check if player is already in squad or bench
    if (userData.squad.main.includes(player.id) || userData.squad.bench.includes(player.id)) {
        return await interaction.reply({ content: `❌ **${player.name}** is already in your squad or bench.`, ephemeral: true });
    }

    // Remove any existing player at this position
    const existingPlayerId = userData.squad.main[position];
    const existingPlayer = existingPlayerId ? userData.players.find(p => p.id === existingPlayerId) : null;

    // Set the new player
    userData.squad.main[position] = player.id;
    client.setUserData(interaction.user.id, userData);

    const formation = userData.formation || '4-3-3';
    const positionName = FORMATION_POSITIONS[formation][position] || 'SUB';
    const emoji = POSITION_EMOJIS[positionName] || '⚽';

    let message = `✅ Set **${player.name}** as ${emoji} ${positionName} (Position ${position + 1}).`;
    if (existingPlayer) {
        message += `\n*Replaced ${existingPlayer.name}*`;
    }

    await interaction.reply({ content: message });
}

async function removePlayer(interaction, userData, client) {
    const position = interaction.options.getInteger('position') - 1;

    if (!userData.squad.main[position]) {
        return await interaction.reply({ content: `❌ Position ${position + 1} is already empty.`, ephemeral: true });
    }

    const playerId = userData.squad.main[position];
    const player = userData.players?.find(p => p.id === playerId);
    userData.squad.main[position] = null;

    client.setUserData(interaction.user.id, userData);
    
    const formation = userData.formation || '4-3-3';
    const positionName = FORMATION_POSITIONS[formation][position] || 'SUB';
    
    await interaction.reply({ content: `✅ Removed **${player ? player.name : 'Unknown Player'}** from ${positionName} (Position ${position + 1}).` });
}

async function setFormation(interaction, userData, client) {
    const formation = interaction.options.getString('formation');
    const oldFormation = userData.formation || '4-3-3';

    userData.formation = formation;
    client.setUserData(interaction.user.id, userData);
    
    let message = `✅ Formation changed from **${oldFormation}** to **${formation}**.`;
    if (oldFormation !== formation) {
        message += '\n*Your current players will stay in their positions, but may need repositioning for optimal chemistry.*';
    }
    
    await interaction.reply({ content: message });
}

async function manageBench(interaction, userData, client) {
    const action = interaction.options.getString('action');
    const playerName = interaction.options.getString('player').toLowerCase();

    if (!userData.players || userData.players.length === 0) {
        return await interaction.reply({ content: '❌ You have no players. Use `/contract` to obtain players first.', ephemeral: true });
    }

    if (action === 'add') {
        if (userData.squad.bench.length >= 7) {
            return await interaction.reply({ content: '❌ Your bench is full (7 players maximum).', ephemeral: true });
        }

        const player = userData.players.find(p => 
            p.name.toLowerCase().includes(playerName) ||
            p.name.toLowerCase().startsWith(playerName)
        );

        if (!player) {
            return await interaction.reply({ content: `❌ Player "${playerName}" not found in your collection.`, ephemeral: true });
        }

        if (userData.squad.main.includes(player.id) || userData.squad.bench.includes(player.id)) {
            return await interaction.reply({ content: `❌ **${player.name}** is already in your squad or bench.`, ephemeral: true });
        }

        userData.squad.bench.push(player.id);
        client.setUserData(interaction.user.id, userData);
        await interaction.reply({ content: `✅ Added **${player.name}** (${player.overall}) to the bench.` });

    } else if (action === 'remove') {
        const benchPlayer = userData.players.find(p => 
            (p.name.toLowerCase().includes(playerName) || p.name.toLowerCase().startsWith(playerName)) && 
            userData.squad.bench.includes(p.id)
        );

        if (!benchPlayer) {
            return await interaction.reply({ content: `❌ Player "${playerName}" not found on your bench.`, ephemeral: true });
        }

        userData.squad.bench = userData.squad.bench.filter(id => id !== benchPlayer.id);
        client.setUserData(interaction.user.id, userData);
        await interaction.reply({ content: `✅ Removed **${benchPlayer.name}** from the bench.` });
    }
}

// --- Improved Autoset Logic ---
function pickBestByPosition(playersPool, position, takenIds) {
    const candidates = playersPool
        .filter(p => p.position === position && !takenIds.has(p.id))
        .sort((a, b) => b.overall - a.overall);
    return candidates.length ? candidates[0] : null;
}

function pickBestCompatible(playersPool, requiredPosition, takenIds) {
    // Position compatibility mapping
    const compatibility = {
        'GK': ['GK'],
        'CB': ['CB', 'LB', 'RB'],
        'LB': ['LB', 'CB', 'LMF'],
        'RB': ['RB', 'CB', 'RMF'],
        'DMF': ['DMF', 'CMF', 'CB'],
        'CMF': ['CMF', 'DMF', 'AMF'],
        'AMF': ['AMF', 'CMF', 'CF'],
        'LMF': ['LMF', 'LB', 'LWF'],
        'RMF': ['RMF', 'RB', 'RWF'],
        'CF': ['CF', 'AMF'],
        'LWF': ['LWF', 'CF', 'LMF'],
        'RWF': ['RWF', 'CF', 'RMF']
    };

    const compatiblePositions = compatibility[requiredPosition] || [requiredPosition];
    
    for (const pos of compatiblePositions) {
        const candidate = pickBestByPosition(playersPool, pos, takenIds);
        if (candidate) return candidate;
    }
    
    return null;
}

function pickBestAny(playersPool, takenIds) {
    const candidates = playersPool
        .filter(p => !takenIds.has(p.id))
        .sort((a, b) => b.overall - a.overall);
    return candidates.length ? candidates[0] : null;
}

async function autosetSquad(interaction, userData, client) {
    const formation = userData.formation || '4-3-3';
    const requiredPositions = FORMATION_POSITIONS[formation];

    if (!userData.players || userData.players.length === 0) {
        return await interaction.reply({ content: '❌ You have no players. Use `/contract` to obtain players first.', ephemeral: true });
    }

    const taken = new Set();
    const main = new Array(11).fill(null);

    // First pass: exact position matches
    for (let i = 0; i < requiredPositions.length; i++) {
        const pos = requiredPositions[i];
        const best = pickBestByPosition(userData.players, pos, taken);
        if (best) {
            main[i] = best.id;
            taken.add(best.id);
        }
    }

    // Second pass: compatible positions
    for (let i = 0; i < requiredPositions.length; i++) {
        if (!main[i]) {
            const pos = requiredPositions[i];
            const compatible = pickBestCompatible(userData.players, pos, taken);
            if (compatible) {
                main[i] = compatible.id;
                taken.add(compatible.id);
            }
        }
    }

    // Third pass: fill remaining with best available
    for (let i = 0; i < requiredPositions.length; i++) {
        if (!main[i]) {
            const bestAny = pickBestAny(userData.players, taken);
            if (bestAny) {
                main[i] = bestAny.id;
                taken.add(bestAny.id);
            }
        }
    }

    // Fill bench with top 7 remaining players
    const bench = userData.players
        .filter(p => !taken.has(p.id))
        .sort((a, b) => b.overall - a.overall)
        .slice(0, 7)
        .map(p => p.id);

    userData.squad.main = main;
    userData.squad.bench = bench;
    client.setUserData(interaction.user.id, userData);

    // Calculate team overall
    const teamPlayers = main
        .map(pid => userData.players.find(p => p.id === pid))
        .filter(Boolean);
    const teamOverall = teamPlayers.length > 0 
        ? Math.round(teamPlayers.reduce((sum, p) => sum + p.overall, 0) / teamPlayers.length)
        : 0;

    const embed = new EmbedBuilder()
        .setTitle('✅ Squad Auto-Set Complete')
        .setColor('#00ff00')
        .setDescription(`**Formation:** ${formation}\n**Team Overall:** ${teamOverall}`)
        .addFields(
            { 
                name: '🏟️ Starting XI', 
                value: main.map((pid, idx) => {
                    const pos = requiredPositions[idx];
                    const player = userData.players.find(p => p.id === pid);
                    const emoji = POSITION_EMOJIS[pos] || '⚽';
                    return player ? `${emoji} ${pos}: **${player.name}** (${player.overall})` : `${emoji} ${pos}: *Empty*`;
                }).join('\n'),
                inline: false
            },
            { 
                name: '🪑 Bench', 
                value: bench.length > 0 
                    ? bench.map(pid => {
                        const player = userData.players.find(p => p.id === pid);
                        return player ? `**${player.name}** (${player.overall})` : '*Unknown*';
                    }).join(', ')
                    : '*No bench players*',
                inline: false
            }
        );

    await interaction.reply({ embeds: [embed] });
}