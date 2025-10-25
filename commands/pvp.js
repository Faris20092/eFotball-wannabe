const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

// Import AI teams from match.js
const AI_TEAMS = require('./match.js').AI_TEAMS;

const MATCH_REWARDS = {
    pvp: {
        win: { gp: 12000, eCoins: 25 },
        draw: { gp: 6000, eCoins: 15 },
        loss: { gp: 3000, eCoins: 8 }
    },
    ai: {
        win: { gp: 4000, eCoins: 8 },
        draw: { gp: 2000, eCoins: 4 },
        loss: { gp: 1000, eCoins: 2 }
    }
};

const cooldowns = new Map();
const activeMatches = new Map();
const matchmakingQueue = new Map(); // userId -> { userData, interaction, timestamp }

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pvp')
        .setDescription('🔥 Battle against real players - PvP Football Showdown! ⚽'),
    
    async execute(interaction) {
        const { client } = interaction;
        const userId = interaction.user.id;

        // Cooldown check
        const now = Date.now();
        const cooldownAmount = 30 * 1000; // 30 seconds for PvP
        if (cooldowns.has(userId)) {
            const expiration = cooldowns.get(userId);
            if (now < expiration) {
                const remaining = Math.ceil((expiration - now) / 1000);
                return await interaction.reply({
                    content: `⏳ **EASY THERE CHAMPION!** Wait **${remaining} seconds** before your next PvP battle! 🔥⚽`,
                    ephemeral: true
                });
            }
        }

        const userData = client.getUserData(userId);
        if (!userData.squad || userData.squad.main.length < 11) {
            return await interaction.reply({
                content: '🚨 **HOLD UP!** You need 11 players in your squad before facing real opponents! Build your DREAM TEAM first! 💪⚽',
                ephemeral: true
            });
        }

        // Check if already in queue or match
        if (matchmakingQueue.has(userId) || activeMatches.has(userId)) {
            return await interaction.reply({
                content: '⚠️ **You\'re already in matchmaking or in a match!** Wait for it to finish first! 🎮',
                ephemeral: true
            });
        }

        cooldowns.set(userId, now + cooldownAmount);

        // Show connection status embed
        const connectionEmbed = new EmbedBuilder()
            .setTitle('🔍 **SEARCHING FOR OPPONENT...**')
            .setDescription('⏳ Checking connection status...\n🌐 Looking for worthy opponents online!')
            .setColor('#f39c12')
            .addFields(
                { name: '👤 Your Team', value: `**${interaction.user.username}**`, inline: true },
                { name: '🎯 Status', value: '🔄 **CONNECTING...**', inline: true },
                { name: '⚡ Mode', value: '**PvP Battle**', inline: true }
            )
            .setFooter({ text: 'Finding the perfect match for you...' });

        await interaction.reply({ embeds: [connectionEmbed] });

        // Add to matchmaking queue
        matchmakingQueue.set(userId, {
            userData,
            interaction,
            timestamp: now,
            username: interaction.user.username
        });

        // Start matchmaking process with progressive updates
        await startMatchmaking(userId, client);
    }
};

async function startMatchmaking(userId, client) {
    const playerData = matchmakingQueue.get(userId);
    if (!playerData) return;

    const MIN_WAIT_TIME = 10000; // 10 seconds minimum
    const MAX_WAIT_TIME = 25000; // 25 seconds maximum
    const CHECK_INTERVAL = 2000; // Check every 2 seconds
    
    let elapsedTime = 0;
    const startTime = Date.now();

    // Update embed every 2 seconds while searching
    const searchInterval = setInterval(async () => {
        if (!matchmakingQueue.has(userId)) {
            clearInterval(searchInterval);
            return;
        }

        elapsedTime = Date.now() - startTime;
        const remainingTime = Math.ceil((MAX_WAIT_TIME - elapsedTime) / 1000);

        // Check if minimum wait time has passed
        if (elapsedTime >= MIN_WAIT_TIME) {
            // Look for real opponent
            const opponent = await findRealOpponent(userId);
            
            if (opponent) {
                clearInterval(searchInterval);
                const [opponentId, opponentData] = opponent;
                
                // Remove both from queue
                matchmakingQueue.delete(userId);
                matchmakingQueue.delete(opponentId);
                
                // Start real PvP match
                await startPvPMatch(playerData, opponentData, opponentId, client, false);
                return;
            }
        }

        // Update searching embed
        const searchEmbed = new EmbedBuilder()
            .setTitle('🔍 **SEARCHING FOR OPPONENT...**')
            .setDescription(`⏳ **${Math.floor(elapsedTime / 1000)}s** elapsed...\n🌐 Looking for players across all servers!`)
            .setColor('#f39c12')
            .addFields(
                { name: '👤 Your Team', value: `**${playerData.username}**`, inline: true },
                { name: '🎯 Status', value: elapsedTime < MIN_WAIT_TIME ? '⏰ **WARMING UP...**' : '🔄 **SEARCHING...**', inline: true },
                { name: '⏱️ Time Left', value: `**${remainingTime}s**`, inline: true }
            )
            .setFooter({ text: 'Matching you with players worldwide...' });

        try {
            await playerData.interaction.editReply({ embeds: [searchEmbed] });
        } catch (error) {
            clearInterval(searchInterval);
        }

        // Max time reached - match with AI
        if (elapsedTime >= MAX_WAIT_TIME) {
            clearInterval(searchInterval);
            matchmakingQueue.delete(userId);
            await matchWithAI(userId, playerData, client);
        }
    }, CHECK_INTERVAL);
}

async function findRealOpponent(userId) {
    // Look for another player in queue (excluding self)
    const availableOpponents = Array.from(matchmakingQueue.entries())
        .filter(([id, data]) => {
            if (id === userId) return false;
            // Check if opponent has been waiting at least 10 seconds
            const waitTime = Date.now() - data.timestamp;
            return waitTime >= 10000 && waitTime < 60000; // Between 10s and 60s
        })
        .sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first

    return availableOpponents.length > 0 ? availableOpponents[0] : null;
}

async function matchWithAI(userId, playerData, client) {
    // Find AI opponent from users who have played
    const allUserIds = (typeof client.listAllUserIds === 'function' ? client.listAllUserIds() : [])
        .filter(id => {
            if (id === userId) return false;
            const userData = client.getUserData(id);
            return userData && userData.squad && userData.squad.main && userData.squad.main.length >= 11;
        });
    
    let aiOpponent;
    let opponentId;
    let isTeamOpponent = false;
    
    if (allUserIds.length === 0) {
        // No real users available - use AI teams from match.js
        const randomTeam = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];
        
        // Create fake user data for team opponent
        aiOpponent = {
            userData: null, // No real user data
            interaction: null,
            timestamp: Date.now(),
            username: randomTeam.name,
            teamStrength: randomTeam.strength
        };
        opponentId = 'team_' + randomTeam.name.replace(/\s+/g, '_');
        isTeamOpponent = true;
    } else {
        // Use real user's squad
        opponentId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
        const opponentUserData = client.getUserData(opponentId);
        
        // Try to get Discord user info
        let opponentUsername = 'AI Opponent';
        try {
            const discordUser = await client.users.fetch(opponentId);
            opponentUsername = discordUser.username;
        } catch (error) {
            console.log(`Could not fetch Discord user ${opponentId}:`, error.message);
            opponentUsername = 'AI Opponent';
        }

        aiOpponent = {
            userData: opponentUserData,
            interaction: null,
            timestamp: Date.now(),
            username: opponentUsername
        };
    }

    // Start AI match
    await startPvPMatch(playerData, aiOpponent, opponentId, client, true, isTeamOpponent);
}

async function findMatch(userId, client) {
    const playerData = matchmakingQueue.get(userId);
    if (!playerData) return;

    // Look for another player in queue (excluding self)
    const availableOpponents = Array.from(matchmakingQueue.entries())
        .filter(([id, data]) => id !== userId && (Date.now() - data.timestamp) < 60000) // Within 1 minute
        .sort((a, b) => a[1].timestamp - b[1].timestamp); // Oldest first

    let opponent = null;
    let opponentId = null;

    if (availableOpponents.length > 0) {
        // Found a real opponent
        [opponentId, opponent] = availableOpponents[0];
    } else {
        // No real opponent found, create AI opponent based on users who have actually played
        const allUserIds = (typeof client.listAllUserIds === 'function' ? client.listAllUserIds() : [])
            .filter(id => {
                if (id === userId) return false;
                // Only include users who have a valid squad
                const userData = client.getUserData(id);
                return userData && userData.squad && userData.squad.main && userData.squad.main.length >= 11;
            });
        
        if (allUserIds.length > 0) {
            opponentId = allUserIds[Math.floor(Math.random() * allUserIds.length)];
            const opponentUserData = client.getUserData(opponentId);
            
            // Try to get Discord user info
            let opponentUsername = 'AI Opponent';
            try {
                const discordUser = await client.users.fetch(opponentId);
                opponentUsername = discordUser.username;
            } catch (error) {
                // If user not found in Discord, try to get from user data
                console.log(`Could not fetch Discord user ${opponentId}:`, error.message);
                opponentUsername = 'AI Opponent';
            }

            opponent = {
                userData: opponentUserData,
                interaction: null, // AI opponent
                timestamp: Date.now(),
                username: opponentUsername
            };
        }
    }

    if (!opponent) {
        // No opponents available, update embed
        const noOpponentEmbed = new EmbedBuilder()
            .setTitle('😔 **NO OPPONENTS FOUND**')
            .setDescription('🌐 No other players are currently looking for a match!\n\n⏰ **Try again in a few minutes** or invite friends to play!')
            .setColor('#e74c3c')
            .addFields(
                { name: '💡 Tip', value: 'Share the bot with friends for more PvP action!', inline: false }
            );

        await playerData.interaction.editReply({ embeds: [noOpponentEmbed] });
        matchmakingQueue.delete(userId);
        return;
    }

    // Remove both players from queue
    matchmakingQueue.delete(userId);
    if (opponentId && matchmakingQueue.has(opponentId)) {
        matchmakingQueue.delete(opponentId);
    }

    // Start the match
    await startPvPMatch(playerData, opponent, opponentId, client);
}

async function startPvPMatch(player1, player2, player2Id, client, isAI = false, isTeamOpponent = false) {
    const teamStrength1 = calculateTeamStrength(player1.userData, client);
    const teamStrength2 = isTeamOpponent ? player2.teamStrength : calculateTeamStrength(player2.userData, client);

    // Create match state
    const matchState = {
        player1Score: 0,
        player2Score: 0,
        events: [],
        currentMinute: 0,
        player1: {
            id: player1.interaction.user.id,
            username: player1.username,
            strength: teamStrength1
        },
        player2: {
            id: player2Id,
            username: player2.username,
            strength: teamStrength2,
            isAI: isAI // Mark if AI opponent
        }
    };

    activeMatches.set(player1.interaction.user.id, matchState);
    if (player2.interaction) {
        activeMatches.set(player2Id, matchState);
    }

    // Update connection embed to show match found
    const matchType = isAI ? 'AI Match' : 'Real PvP';
    const opponentDisplay = isAI ? `${player2.username} (AI)` : player2.username;
    
    const matchFoundEmbed = new EmbedBuilder()
        .setTitle(`✅ **OPPONENT FOUND!** ${isAI ? '🤖' : '👥'}`)
        .setDescription(`🎮 **${player1.username}** 🆚 **${opponentDisplay}**\n\n🔥 **MATCH STARTING...**`)
        .setColor(isAI ? '#3498db' : '#27ae60')
        .addFields(
            { name: '⚽ Score', value: '**0 - 0**', inline: true },
            { name: '⏰ Time', value: "**0' - KICK OFF!** 🚀", inline: true },
            { name: '💪 Team Power', value: `**${teamStrength1}** vs **${teamStrength2}**`, inline: true },
            { name: '🎮 Match Type', value: `**${matchType}**`, inline: false }
        )
        .setFooter({ text: isAI ? '🤖 AI MATCH STARTING!' : '🔥 REAL PvP MATCH! Get ready for EPIC action!' });

    await player1.interaction.editReply({ embeds: [matchFoundEmbed] });

    // If real opponent, notify them too
    if (player2.interaction) {
        try {
            await player2.interaction.editReply({ embeds: [matchFoundEmbed] });
        } catch (error) {
            console.log('Could not update opponent embed:', error.message);
        }
    }

    // Generate and process match events
    const matchEvents = generatePvPMatchTimeline(teamStrength1, teamStrength2);
    await processPvPMatchEvents(player1.interaction, player2.interaction, matchEvents, matchState, client);
}

function generatePvPMatchTimeline(strength1, strength2) {
    const events = [];
    const totalStrength = strength1 + strength2;
    const player1Chance = strength1 / totalStrength;
    const player2Chance = strength2 / totalStrength;

    // First half events (0-45 minutes)
    const firstHalfMinutes = [];
    for (let i = 0; i < 4; i++) {
        const randomMinute = 5 + Math.floor(Math.random() * 40);
        firstHalfMinutes.push(randomMinute);
    }
    firstHalfMinutes.sort((a, b) => a - b);

    firstHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < player1Chance * 0.4) {
            events.push({
                minute,
                type: 'goal_player1',
                message: `**${minute}' ⚽ SPECTACULAR GOAL by ${events.length > 0 ? 'Player 1' : 'you'}!!** 🚀⚡`,
                delay: 2000
            });
        } else if (rand < (player1Chance * 0.4) + (player2Chance * 0.4)) {
            events.push({
                minute,
                type: 'goal_player2',
                message: `**${minute}' ⚽ AMAZING GOAL by the opponent!** 🔥💀`,
                delay: 2000
            });
        } else if (rand < 0.6) {
            const comments = [
                `**${minute}' 💨 Lightning fast attack!** ⚡`,
                `**${minute}' 🛡️ Solid defensive play!** 🔒`,
                `**${minute}' 🎯 Close chance! So near!** 😱`,
                `**${minute}' 🔥 The intensity is building!** 💪`
            ];
            events.push({
                minute,
                type: 'comment',
                message: comments[Math.floor(Math.random() * comments.length)],
                delay: 1500
            });
        }
    });

    // Half time
    events.push({
        minute: 45,
        type: 'halftime',
        message: "**45' ⏱️ HALF TIME! What a battle so far!** 🔥",
        delay: 2000
    });

    // Second half events (46-90 minutes)
    const secondHalfMinutes = [];
    for (let i = 0; i < 5; i++) {
        const randomMinute = 46 + Math.floor(Math.random() * 44);
        secondHalfMinutes.push(randomMinute);
    }
    secondHalfMinutes.sort((a, b) => a - b);

    secondHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < player1Chance * 0.6) {
            events.push({
                minute,
                type: 'goal_player1',
                message: `**${minute}' ⚽ INCREDIBLE GOAL!! UNSTOPPABLE!!** 🚀⚡`,
                delay: 2000
            });
        } else if (rand < (player1Chance * 0.6) + (player2Chance * 0.6)) {
            events.push({
                minute,
                type: 'goal_player2',
                message: `**${minute}' ⚽ BRILLIANT STRIKE! What a response!** 🔥💀`,
                delay: 2000
            });
        } else if (rand < 0.7) {
            const lateComments = [
                `**${minute}' 💨 PACE! Lightning speed!** ⚡`,
                `**${minute}' 🔄 Tactical substitution!** 🔥`,
                `**${minute}' ⏰ Time is running out!** ⌛`,
                `**${minute}' 🎪 SKILL! The crowd goes WILD!** 🤯`
            ];
            events.push({
                minute,
                type: 'comment',
                message: lateComments[Math.floor(Math.random() * lateComments.length)],
                delay: 1500
            });
        }
    });

    // Interactive chance
    if (Math.random() < 0.5) {
        const chanceMinute = 15 + Math.floor(Math.random() * 70);
        const kinds = ['Chance', 'Free Kick', 'Penalty'];
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        
        events.push({
            minute: chanceMinute,
            type: 'chance',
            kind: kind,
            message: `**${chanceMinute}' 🎯 ${kind} OPPORTUNITY!! This could change everything!** ⚡🔥`,
            delay: 2000
        });
    }

    // Full time
    events.push({
        minute: 90,
        type: 'fulltime',
        message: "**90' ⏱️ FULL TIME! What an EPIC PvP battle!** 🏆🔥",
        delay: 2000
    });

    return events;
}

async function processPvPMatchEvents(interaction1, interaction2, events, matchState, client) {
    events.sort((a, b) => a.minute - b.minute);

    for (const event of events) {
        await new Promise(r => setTimeout(r, event.delay));
        
        // Update match state
        if (event.type === 'goal_player1') {
            matchState.player1Score++;
        } else if (event.type === 'goal_player2') {
            matchState.player2Score++;
        }

        matchState.currentMinute = event.minute;

        // Handle interactive chances
        if (event.type === 'chance') {
            await handlePvPChance(interaction1, interaction2, event, matchState);
            continue;
        }

        // Create and send embeds
        const embed = createPvPMatchEmbed(matchState, event.message);
        
        try {
            await interaction1.editReply({ embeds: [embed] });
        } catch (error) {
            console.log('Could not update player 1 embed:', error.message);
        }

        if (interaction2) {
            try {
                await interaction2.editReply({ embeds: [embed] });
            } catch (error) {
                console.log('Could not update player 2 embed:', error.message);
            }
        }

        // Handle full time
        if (event.type === 'fulltime') {
            await handlePvPMatchEnd(interaction1, interaction2, matchState, client);
            break;
        }
    }
}

async function handlePvPChance(interaction1, interaction2, event, matchState) {
    const buttons = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId(`pvpshoot_left_${matchState.player1.id}_${event.minute}_${event.kind}`)
                .setLabel('⬅️ LEFT')
                .setStyle(ButtonStyle.Primary),
            new ButtonBuilder()
                .setCustomId(`pvpshoot_center_${matchState.player1.id}_${event.minute}_${event.kind}`)
                .setLabel('🎯 CENTER')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId(`pvpshoot_right_${matchState.player1.id}_${event.minute}_${event.kind}`)
                .setLabel('➡️ RIGHT')
                .setStyle(ButtonStyle.Primary)
        );

    const embed = createPvPMatchEmbed(matchState, event.message);
    
    try {
        await interaction1.editReply({ embeds: [embed], components: [buttons] });
    } catch (error) {
        console.log('Could not update player 1 chance embed:', error.message);
    }

    if (interaction2) {
        try {
            await interaction2.editReply({ embeds: [embed] });
        } catch (error) {
            console.log('Could not update player 2 chance embed:', error.message);
        }
    }

    // Wait for button interaction or timeout
    return new Promise((resolve) => {
        matchState.chanceResolve = resolve;
        matchState.chanceTimeout = setTimeout(() => {
            // Auto-miss if no response
            const autoEmbed = createPvPMatchEmbed(matchState, `**${event.minute}' ⏰ TIME'S UP! Opportunity missed!** 😱\n\n*CHANCE COMPLETED* ✅`);
            interaction1.editReply({ embeds: [autoEmbed], components: [] }).catch(() => {});
            if (interaction2) {
                interaction2.editReply({ embeds: [autoEmbed], components: [] }).catch(() => {});
            }
            resolve();
        }, 10000);
    });
}

function createPvPMatchEmbed(matchState, message) {
    const opponentDisplay = matchState.player2.isAI 
        ? `${matchState.player2.username} (AI)` 
        : matchState.player2.username;
    
    return new EmbedBuilder()
        .setTitle('⚽ **PvP FOOTBALL BATTLE** 🔥')
        .setDescription(`**${matchState.player1.username}** 🆚 **${opponentDisplay}**`)
        .addFields(
            { name: '⚽ Score', value: `**${matchState.player1Score} - ${matchState.player2Score}**`, inline: true },
            { name: '⏰ Time', value: `**${matchState.currentMinute}'**`, inline: true },
            { name: '💪 Power', value: `**${matchState.player1.strength}** vs **${matchState.player2.strength}**`, inline: true },
            { name: '📝 Match Update', value: message, inline: false }
        )
        .setColor('#e74c3c')
        .setFooter({ text: '🔥 PvP BATTLE IN PROGRESS!' });
}

async function handlePvPMatchEnd(interaction1, interaction2, matchState, client) {
    // Determine outcomes
    const player1Outcome = determineOutcome(matchState.player1Score, matchState.player2Score);
    const player2Outcome = determineOutcome(matchState.player2Score, matchState.player1Score);

    // Determine reward type based on opponent
    const rewardType = matchState.player2.isAI ? 'ai' : 'pvp';

    // Award rewards
    const player1Data = client.getUserData(matchState.player1.id);
    const player1Rewards = MATCH_REWARDS[rewardType][player1Outcome];
    player1Data.gp += player1Rewards.gp;
    player1Data.eCoins += player1Rewards.eCoins;
    client.setUserData(matchState.player1.id, player1Data);

    if (!matchState.player2.isAI) {
        const player2Data = client.getUserData(matchState.player2.id);
        const player2Rewards = MATCH_REWARDS.pvp[player2Outcome];
        player2Data.gp += player2Rewards.gp;
        player2Data.eCoins += player2Rewards.eCoins;
        client.setUserData(matchState.player2.id, player2Data);
    }

    // Create final embeds
    const finalEmbed1 = new EmbedBuilder()
        .setTitle(`🏆 **MATCH RESULT: ${player1Outcome.toUpperCase()}!** 🏆`)
        .setDescription(`**Final Score:** ${matchState.player1Score} - ${matchState.player2Score}`)
        .addFields(
            { name: '💰 Rewards Earned', value: `**+${player1Rewards.gp.toLocaleString()} GP**\n**+${player1Rewards.eCoins} eCoins**`, inline: true },
            { name: '🎮 Match Type', value: matchState.player2.isAI ? '**vs AI**' : '**PvP Battle**', inline: true },
            { name: '🔥 Result', value: getResultMessage(player1Outcome), inline: false }
        )
        .setColor(getResultColor(player1Outcome))
        .setFooter({ text: 'Great PvP match! Play again soon!' });

    try {
        await interaction1.editReply({ embeds: [finalEmbed1], components: [] });
    } catch (error) {
        console.log('Could not send final embed to player 1:', error.message);
    }

    if (interaction2) {
        const finalEmbed2 = new EmbedBuilder()
            .setTitle(`🏆 **MATCH RESULT: ${player2Outcome.toUpperCase()}!** 🏆`)
            .setDescription(`**Final Score:** ${matchState.player2Score} - ${matchState.player1Score}`)
            .addFields(
                { name: '💰 Rewards Earned', value: `**+${MATCH_REWARDS.pvp[player2Outcome].gp.toLocaleString()} GP**\n**+${MATCH_REWARDS.pvp[player2Outcome].eCoins} eCoins**`, inline: true },
                { name: '🎮 Match Type', value: '**PvP Battle**', inline: true },
                { name: '🔥 Result', value: getResultMessage(player2Outcome), inline: false }
            )
            .setColor(getResultColor(player2Outcome))
            .setFooter({ text: 'Great PvP match! Play again soon!' });

        try {
            await interaction2.editReply({ embeds: [finalEmbed2], components: [] });
        } catch (error) {
            console.log('Could not send final embed to player 2:', error.message);
        }
    }

    // Clean up
    activeMatches.delete(matchState.player1.id);
    if (!matchState.player2.isAI) {
        activeMatches.delete(matchState.player2.id);
    }
}

// Import utility functions from match.js
function calculateTeamStrength(userData, client) {
    if (!userData.squad || !userData.squad.main || userData.squad.main.length < 11) {
        return 50; // Default low strength
    }

    let totalStrength = 0;
    let playerCount = 0;

    for (const playerId of userData.squad.main) {
        if (playerId) {
            const player = userData.players.find(p => p.id === playerId);
            if (player) {
                totalStrength += player.overall;
                playerCount++;
            }
        }
    }

    return playerCount > 0 ? Math.round(totalStrength / playerCount) : 50;
}

function determineOutcome(playerScore, opponentScore) {
    if (playerScore > opponentScore) return 'win';
    if (playerScore < opponentScore) return 'loss';
    return 'draw';
}

function getResultMessage(outcome) {
    const messages = {
        win: '🎉 **VICTORY!** You dominated the field! 🏆',
        draw: '🤝 **DRAW!** A hard-fought battle! ⚖️',
        loss: '💪 **DEFEAT!** You fought bravely! 🛡️'
    };
    return messages[outcome] || '⚽ Match completed!';
}

function getResultColor(outcome) {
    const colors = {
        win: '#27ae60',
        draw: '#f39c12',
        loss: '#e74c3c'
    };
    return colors[outcome] || '#95a5a6';
}

// Handle PvP button interactions
module.exports.handleButton = async (interaction, client) => {
    const [action, direction, userId, minute, kind] = interaction.customId.split('_');
    
    if (action !== 'pvpshoot') return;
    if (interaction.user.id !== userId) {
        return interaction.reply({ content: "⛔ **HEY!** This button isn't for you! 😤", ephemeral: true });
    }

    const matchState = activeMatches.get(userId);
    if (!matchState) {
        return interaction.reply({ content: "❌ **OOPS!** Match not found! 🤔", ephemeral: true });
    }

    await interaction.deferUpdate();

    if (matchState.chanceTimeout) {
        clearTimeout(matchState.chanceTimeout);
    }

    // Determine outcome
    const successRates = {
        'Penalty': 0.75,
        'Free Kick': 0.35,
        'Chance': 0.50
    };
    
    const successRate = successRates[kind] || 0.50;
    const outcome = Math.random() < successRate ? 'goal' : 'miss';
    
    if (outcome === 'goal') {
        matchState.player1Score++;
    }

    // Create result message
    let resultMessage;
    if (outcome === 'goal') {
        if (kind === 'Free Kick') resultMessage = `**${minute}' 🎯 GOOOAL!! INCREDIBLE FREE KICK to the ${direction.toLowerCase()}!** ⚡🔥\n\n*CHANCE COMPLETED* ✅`;
        else if (kind === 'Penalty') resultMessage = `**${minute}' ✅ PENALTY GOAL!! Perfect shot to the ${direction.toLowerCase()}!** 🧊👑\n\n*CHANCE COMPLETED* ✅`;
        else resultMessage = `**${minute}' ⚽ AMAZING GOAL!! Perfect finish to the ${direction.toLowerCase()}!** 🌟💎\n\n*CHANCE COMPLETED* ✅`;
    } else {
        if (kind === 'Free Kick') resultMessage = `**${minute}' 😩 OH NO! Free kick ${direction.toLowerCase()} of target!** 💔\n\n*CHANCE COMPLETED* ✅`;
        else if (kind === 'Penalty') resultMessage = `**${minute}' 🥅 SAVED!! Keeper guessed ${direction.toLowerCase()} perfectly!** 🔥🧤\n\n*CHANCE COMPLETED* ✅`;
        else resultMessage = `**${minute}' 😱 BLOCKED! Keeper made an INCREDIBLE save going ${direction.toLowerCase()}!** 🛡️⚡\n\n*CHANCE COMPLETED* ✅`;
    }

    matchState.currentMinute = parseInt(minute);

    const embed = createPvPMatchEmbed(matchState, resultMessage);
    await interaction.editReply({ embeds: [embed], components: [] });

    // Resolve the promise to continue match
    if (matchState.chanceResolve) {
        matchState.chanceResolve();
    }
};
