const { 
    SlashCommandBuilder, 
    EmbedBuilder, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle 
} = require('discord.js');

const AI_TEAMS = [
    // 🌍 Top Clubs
    { name: 'FC Barcelona', strength: 85 },
    { name: 'Real Madrid', strength: 87 },
    { name: 'Manchester City', strength: 86 },
    { name: 'Liverpool', strength: 84 },
    { name: 'Bayern Munich', strength: 85 },
    { name: 'Paris Saint-Germain', strength: 83 },
    { name: 'Chelsea', strength: 82 },
    { name: 'Juventus', strength: 81 },
    { name: 'Arsenal', strength: 80 },
    { name: 'Manchester United', strength: 79 },
    { name: 'Atletico Madrid', strength: 82 },
    { name: 'Inter Milan', strength: 81 },
    { name: 'AC Milan', strength: 80 },
    { name: 'Tottenham', strength: 78 },
    { name: 'Borussia Dortmund', strength: 79 },
    { name: 'Ajax', strength: 77 },
    { name: 'Sevilla', strength: 78 },
    { name: 'RB Leipzig', strength: 80 },
    { name: 'Napoli', strength: 81 },
    { name: 'Roma', strength: 79 },
    { name: 'Porto', strength: 78 },
    { name: 'Benfica', strength: 79 },
    { name: 'Sporting CP', strength: 77 },
    { name: 'Monaco', strength: 78 },
    { name: 'Lazio', strength: 78 },
    { name: 'Villarreal', strength: 77 },
    { name: 'Real Sociedad', strength: 77 },
    { name: 'Athletic Bilbao', strength: 76 },
    { name: 'Valencia', strength: 75 },
    { name: 'Marseille', strength: 77 },
    { name: 'Lyon', strength: 77 },
    { name: 'Shakhtar Donetsk', strength: 76 },
    { name: 'Galatasaray', strength: 75 },
    { name: 'Fenerbahce', strength: 75 },
    { name: 'Besiktas', strength: 74 },
    { name: 'Celtic', strength: 74 },
    { name: 'Rangers', strength: 74 },
    { name: 'PSV Eindhoven', strength: 76 },
    { name: 'Feyenoord', strength: 75 },
    { name: 'Anderlecht', strength: 73 },
    { name: 'Club Brugge', strength: 74 },
    { name: 'Zenit St. Petersburg', strength: 76 },
    { name: 'CSKA Moscow', strength: 74 },
    { name: 'Spartak Moscow', strength: 73 },
    { name: 'Dinamo Zagreb', strength: 73 },
    { name: 'Red Bull Salzburg', strength: 74 },
    { name: 'Basel', strength: 72 },
    { name: 'Young Boys', strength: 72 },
    { name: 'Olympiacos', strength: 74 },

    // 🌎 National Teams
    { name: 'Brazil', strength: 87 },
    { name: 'Argentina', strength: 86 },
    { name: 'France', strength: 88 },
    { name: 'Germany', strength: 85 },
    { name: 'Spain', strength: 84 },
    { name: 'Portugal', strength: 84 },
    { name: 'England', strength: 85 },
    { name: 'Italy', strength: 83 },
    { name: 'Netherlands', strength: 83 },
    { name: 'Belgium', strength: 84 },
    { name: 'Uruguay', strength: 82 },
    { name: 'Croatia', strength: 82 },
    { name: 'Denmark', strength: 81 },
    { name: 'Switzerland', strength: 80 },
    { name: 'Sweden', strength: 79 },
    { name: 'Poland', strength: 79 },
    { name: 'Serbia', strength: 78 },
    { name: 'Mexico', strength: 81 },
    { name: 'USA', strength: 80 },
    { name: 'Canada', strength: 77 },
    { name: 'Japan', strength: 79 },
    { name: 'South Korea', strength: 78 },
    { name: 'Australia', strength: 77 },
    { name: 'Morocco', strength: 80 },
    { name: 'Senegal', strength: 81 },
    { name: 'Nigeria', strength: 78 },
    { name: 'Egypt', strength: 78 },
    { name: 'Ghana', strength: 77 },
    { name: 'Cameroon', strength: 77 },
    { name: 'Turkey', strength: 78 },
    { name: 'Iran', strength: 76 },
    { name: 'Saudi Arabia', strength: 75 },
    { name: 'Qatar', strength: 74 },
    { name: 'South Africa', strength: 74 },
    { name: 'Ivory Coast', strength: 78 },
    { name: 'Chile', strength: 80 },
    { name: 'Colombia', strength: 81 },
    { name: 'Peru', strength: 77 },
    { name: 'Ecuador', strength: 78 },
    { name: 'Paraguay', strength: 76 },
    { name: 'Venezuela', strength: 74 },
    { name: 'Costa Rica', strength: 75 },
    { name: 'Panama', strength: 74 },
    { name: 'Honduras', strength: 73 },
    { name: 'Iraq', strength: 73 },
    { name: 'UAE', strength: 74 },
    { name: 'China', strength: 72 },
    { name: 'India', strength: 70 },
    { name: 'Thailand', strength: 71 }
];

const MATCH_REWARDS = {
    win: { gp: 5000, eCoins: 10 },
    draw: { gp: 2000, eCoins: 5 },
    loss: { gp: 1000, eCoins: 2 }
};

const cooldowns = new Map();
const activeMatches = new Map(); // Track active matches

module.exports = {
    data: new SlashCommandBuilder()
        .setName('match')
        .setDescription('🔥 Battle against legendary AI teams - Are you ready to become a CHAMPION?! ⚽'),
    AI_TEAMS: AI_TEAMS, // Export AI_TEAMS for use in pvp.js
    async execute(interaction) {
        const { client } = interaction;
        const userId = interaction.user.id;

        // Cooldown
        const now = Date.now();
        const cooldownAmount = 20 * 1000;
        if (cooldowns.has(userId)) {
            const expiration = cooldowns.get(userId);
            if (now < expiration) {
                const remaining = Math.ceil((expiration - now) / 1000);
                return await interaction.reply({
                    content: `⏳ **WHOA THERE CHAMPION!** You gotta wait **${remaining} seconds** before your next EPIC battle! 🔥⚽`,
                    ephemeral: true
                });
            }
        }
        cooldowns.set(userId, now + cooldownAmount);

        const userData = client.getUserData(userId);
        if (!userData.squad || userData.squad.main.length < 11) {
            return await interaction.reply({
                content: '🚨 **HOLD UP!** You need 11 players in your squad before stepping onto the battlefield! Go build your DREAM TEAM first! 💪⚽',
                ephemeral: true
            });
        }

        const teamStrength = calculateTeamStrength(userData, client);
        const opponent = AI_TEAMS[Math.floor(Math.random() * AI_TEAMS.length)];

        // Initialize match state
        const matchState = {
            playerScore: 0,
            opponentScore: 0,
            events: [],
            currentMinute: 0,
            opponent: opponent,
            userId: userId,
            username: interaction.user.username,
            teamStrength: teamStrength // Store team strength for display
        };
        activeMatches.set(userId, matchState);

        // Initial embed
        const embed = new EmbedBuilder()
            .setTitle('⚽ **EPIC FOOTBALL SHOWDOWN** 🔥')
            .setDescription(`**${interaction.user.username}'s LEGENDARY Team** 🆚 **${opponent.name}**`)
            .addFields(
                { name: '⚽ Score', value: '**0 - 0**', inline: true },
                { name: '⏰ Time', value: "**0' - LET'S GOOO!** 🚀", inline: true },
                { name: '💪 Team Power', value: `**${teamStrength}** vs **${opponent.strength}**`, inline: true }
            )
            .setColor('#3498db')
            .setFooter({ text: `🔥 MATCH IS HEATING UP! Get ready for some ACTION! | Your Team: ${teamStrength}` });

        await interaction.reply({ embeds: [embed] });

        // Generate and process match events
        const matchEvents = generateMatchTimeline(teamStrength, opponent.strength);
        await processMatchEvents(interaction, matchEvents, matchState, client, userData);
    }
};

async function processMatchEvents(interaction, events, matchState, client, userData) {
    let currentEventIndex = 0;
    
    // Sort events by minute
    events.sort((a, b) => a.minute - b.minute);

    for (const event of events) {
        await new Promise(r => setTimeout(r, event.delay));
        
        // Update match state based on event
        if (event.type === 'goal_player') {
            matchState.playerScore++;
        } else if (event.type === 'goal_opponent') {
            matchState.opponentScore++;
        }
        
        matchState.currentMinute = event.minute;
        matchState.events.push(event);

        if (event.type === 'chance') {
            // Show interactive chance
            const embed = createMatchEmbed(matchState, event.message);
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`shoot_left_${matchState.userId}_${event.minute}_${event.kind}`).setLabel('Left').setEmoji('⬅️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`shoot_center_${matchState.userId}_${event.minute}_${event.kind}`).setLabel('Center').setEmoji('⬆️').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId(`shoot_right_${matchState.userId}_${event.minute}_${event.kind}`).setLabel('Right').setEmoji('➡️').setStyle(ButtonStyle.Primary)
            );
            
            await interaction.editReply({ embeds: [embed], components: [row] });
            
            // Wait for button interaction or timeout
            await new Promise(resolve => {
                const timeout = setTimeout(() => {
                    // Auto-resolve if no button pressed and not handled by button
                    if (!matchState.buttonHandled) {
                        const autoOutcome = Math.random() < 0.4 ? 'goal' : 'miss';
                        if (autoOutcome === 'goal') {
                            matchState.playerScore++;
                        }
                        // Update embed with timeout result
                        const timeoutMessage = autoOutcome === 'goal' ? 
                            `**${event.minute}' ⚽ TIMEOUT GOAL! Lucky break!** 🍀\n\n*CHANCE COMPLETED* ✅` :
                            `**${event.minute}' ❌ MISSED! Time ran out!** ⏰\n\n*CHANCE COMPLETED* ✅`;
                        matchState.timeoutMessage = timeoutMessage;
                    }
                    resolve();
                }, 10000); // 10 second timeout

                // Store timeout for potential clearing
                matchState.chanceTimeout = timeout;
                matchState.chanceResolve = resolve;
                matchState.buttonHandled = false; // Reset flag
            });
            
        } else {
            // Regular event - just update embed
            const embed = createMatchEmbed(matchState, event.message);
            await interaction.editReply({ embeds: [embed], components: [] });
        }
    }

    // Final result
    const outcome = determineOutcome(matchState.playerScore, matchState.opponentScore);
    const reward = MATCH_REWARDS[outcome];
    userData.gp += reward.gp;
    userData.eCoins += reward.eCoins;
    // Track stats for leaderboards
    if (!userData.stats) userData.stats = { wins: 0, draws: 0, losses: 0, lastStrength: 0, bestStrength: 0 };
    const strengthNow = calculateTeamStrength(userData, client);
    userData.stats.lastStrength = strengthNow;
    userData.stats.bestStrength = Math.max(userData.stats.bestStrength || 0, strengthNow);
    if (outcome === 'win') userData.stats.wins += 1;
    else if (outcome === 'draw') userData.stats.draws += 1;
    else userData.stats.losses += 1;
    client.setUserData(matchState.userId, userData);

    const finalEmbed = new EmbedBuilder()
        .setTitle(outcome === 'win' ? '🏆 **VICTORY!! YOU ARE THE CHAMPION!** 🔥' : 
                 outcome === 'draw' ? '🤝 **EPIC DRAW! What a battle!** ⚡' : 
                 '😤 **DEFEAT! Come back stronger!** 💪')
        .setDescription(`**${matchState.username}'s LEGENDARY Team** 🆚 **${matchState.opponent.name}**`)
        .addFields(
            { name: '⚽ **FINAL SCORE**', value: `**${matchState.playerScore} - ${matchState.opponentScore}**`, inline: true },
            { name: '🎯 **RESULT**', value: `**${outcome.toUpperCase()}**`, inline: true },
            { name: '💰 **EPIC REWARDS**', value: `**+${reward.gp} GP** 💎 **+${reward.eCoins} eCoins** 🪙`, inline: false }
        )
        .setColor(outcome === 'win' ? '#2ecc71' : outcome === 'draw' ? '#f1c40f' : '#e74c3c')
        .setFooter({ text: outcome === 'win' ? '🏆 LEGENDARY PERFORMANCE! You\'re unstoppable!' : 
                           outcome === 'draw' ? '⚡ What an INTENSE battle! Both teams fought hard!' :
                           '💪 Every champion faces defeats! Train harder and come back stronger!' });

    await interaction.editReply({ embeds: [finalEmbed], components: [] });
    activeMatches.delete(matchState.userId);
}

function createMatchEmbed(matchState, latestEvent) {
    // Calculate team strength for display
    const userTeamStrength = matchState.teamStrength || 'N/A';
    
    const embed = new EmbedBuilder()
        .setTitle('⚽ **EPIC FOOTBALL BATTLE** 🔥')
        .setDescription(`**${matchState.username}'s DREAM Team** 🆚 **${matchState.opponent.name}**`)
        .addFields(
            { name: '⚽ **Score**', value: `**${matchState.playerScore} - ${matchState.opponentScore}**`, inline: true },
            { name: '⏰ **Time**', value: `**${matchState.currentMinute}'**`, inline: true },
            { name: '💪 **Team Power**', value: `**${userTeamStrength}** vs **${matchState.opponent.strength}**`, inline: true },
            { name: '🎯 **Latest Action**', value: latestEvent || '**Match starting... GET READY!** 🚀', inline: false }
        )
        .setColor('#3498db');

    // Add match status
    if (matchState.currentMinute >= 90) {
        embed.setFooter({ text: '⏱️ FULL TIME! What an AMAZING match!' });
    } else if (matchState.currentMinute >= 45 && matchState.currentMinute < 46) {
        embed.setFooter({ text: '☕ HALF TIME! Time to strategize!' });
    } else {
        embed.setFooter({ text: '🔥 MATCH IS ON FIRE! The tension is REAL!' });
    }

    return embed;
}

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

function generateMatchTimeline(playerStrength, opponentStrength) {
    const events = [];
    
    // Calculate probabilities
    const playerChance = (playerStrength / (playerStrength + opponentStrength)) * 0.5;
    const opponentChance = (opponentStrength / (playerStrength + opponentStrength)) * 0.5;

  // First half events (0-45) - Random timeline
const firstHalfEventCount = 4 + Math.floor(Math.random() * 3); // 4-6 events
const firstHalfMinutes = [];
for (let i = 0; i < firstHalfEventCount; i++) {
    const randomMinute = 5 + Math.floor(Math.random() * 40); // 5-44 minutes
    if (!firstHalfMinutes.includes(randomMinute)) {
        firstHalfMinutes.push(randomMinute);
    }
}
firstHalfMinutes.sort((a, b) => a - b);

firstHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < playerChance * 0.6) {
            events.push({
                minute,
                type: 'goal_player',
                message: `**${minute}' ⚽ GOOOAAAAAL!! YOUR TEAM SCORES!! WHAT A STRIKE!** 🔥🎯`,
                delay: 2000
            });
        } else if (rand < (playerChance * 0.6) + (opponentChance * 0.6)) {
            events.push({
                minute,
                type: 'goal_opponent', 
                message: `**${minute}' ⚽ OH NO! ${events.find(e => e.minute === minute)?.opponent || 'Opponent'} scores! Time to fight back!** 😤`,
                delay: 2000
            });
        } else if (rand < 0.8) {
            const comments = [
                `**${minute}' 🥅 INCREDIBLE SAVE! The keeper is ON FIRE!** 🔥`,
                `**${minute}' 😱 SO CLOSE! Just inches away from GLORY!** ⚡`,
                `**${minute}' 🛡️ DEFENSIVE MASTERCLASS! What a tackle!** 💪`,
                `**${minute}' 🟨 YELLOW CARD! Things are getting HEATED!** 🌶️`,
                `**${minute}' ⚡ LIGHTNING FAST counter attack! AMAZING!** 🏃‍♂️`,
                `**${minute}' 🎯 CROSSBAR! Unlucky! So close to perfection!** 😩`
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
        message: "**45' ⏸️ HALF TIME! Time for tactical genius!** ☕🧠",
        delay: 2000
    });

 // Second half events (46-90) - Random timeline
const secondHalfEventCount = 4 + Math.floor(Math.random() * 3); // 4-6 events
const secondHalfMinutes = [];
for (let i = 0; i < secondHalfEventCount; i++) {
    const randomMinute = 46 + Math.floor(Math.random() * 44); // 46-89 minutes
    if (!secondHalfMinutes.includes(randomMinute)) {
        secondHalfMinutes.push(randomMinute);
    }
}
secondHalfMinutes.sort((a, b) => a - b);

secondHalfMinutes.forEach(minute => {
        const rand = Math.random();
        if (rand < playerChance * 0.6) {
            events.push({
                minute,
                type: 'goal_player',
                message: `**${minute}' ⚽ SPECTACULAR GOAL!! YOUR TEAM IS UNSTOPPABLE!!** 🚀⚡`,
                delay: 2000
            });
        } else if (rand < (playerChance * 0.6) + (opponentChance * 0.6)) {
            events.push({
                minute,
                type: 'goal_opponent',
                message: `**${minute}' ⚽ Opponent strikes back! The battle intensifies!** 🔥💀`,
                delay: 2000
            });
        } else if (rand < 0.7) {
            const lateComments = [
                `**${minute}' 💨 PACE! Lightning speed down the wing!** ⚡`,
                `**${minute}' 🔄 SUBSTITUTION! Fresh legs for the final push!** 🔥`,
                `**${minute}' ⏰ TIME IS TICKING! Every second counts now!** ⌛`,
                `**${minute}' 🎪 SKILL MOVE! What technique! The crowd goes WILD!** 🤯`
            ];
            events.push({
                minute,
                type: 'comment',
                message: lateComments[Math.floor(Math.random() * lateComments.length)],
                delay: 1500
            });
        }
    });

 // Random interactive chance
if (Math.random() < 0.4) {
    const chanceMinute = 10 + Math.floor(Math.random() * 75); // 10-84 minutes
        const kinds = ['Chance', 'Free Kick', 'Penalty']; // <-- changed as requested
        const kind = kinds[Math.floor(Math.random() * kinds.length)];
        
        events.push({
            minute: chanceMinute,
            type: 'chance',
            kind: kind,
            message: `**${chanceMinute}' 🎯 ${kind} OPPORTUNITY!! This could be LEGENDARY! Choose your destiny!** ⚡🔥`,
            delay: 2000
        });
    }

    // Full time
    events.push({
        minute: 90,
        type: 'fulltime',
        message: "**90' ⏱️ FULL TIME! What an EPIC battle!** 🏆🔥",
        delay: 2000
    });

    return events;
}

function determineOutcome(playerScore, opponentScore) {
    if (playerScore > opponentScore) return 'win';
    if (playerScore < opponentScore) return 'loss';
    return 'draw';
}

module.exports.handleButton = async (interaction, client) => {
    const [action, direction, userId, minute, kind] = interaction.customId.split('_');
    
    if (action !== 'shoot') return;
    if (interaction.user.id !== userId) {
        return interaction.reply({ content: "⛔ **HEY!** This button isn't for you, champion! Wait your turn! 😤", ephemeral: true });
    }

    const matchState = activeMatches.get(userId);
    if (!matchState) {
        return interaction.reply({ content: "❌ **OOPS!** Match not found! Maybe it already ended? 🤔", ephemeral: true });
    }

    await interaction.deferUpdate();

    // Clear timeout if exists
    if (matchState.chanceTimeout) {
        clearTimeout(matchState.chanceTimeout);
    }

    // Determine outcome based on shot type and direction
    const successRates = {
        'Penalty': 0.75,    // <-- changed key
        'Free Kick': 0.35,  // <-- changed key
        'Chance': 0.50      // <-- changed key
    };
    
    const successRate = successRates[kind] || 0.50;
    const outcome = Math.random() < successRate ? 'goal' : 'miss';
    
    if (outcome === 'goal') {
        matchState.playerScore++;
    }

 // Update with result message (checks match new kind strings)
let resultMessage;
if (outcome === 'goal') {
    if (kind === 'Free Kick') resultMessage = `**${minute}' 🎯 GOOOAL!! INCREDIBLE FREE KICK to the ${direction.toLowerCase()}! WHAT A STRIKE!** ⚡🔥\n\n*CHANCE COMPLETED* ✅`;
    else if (kind === 'Penalty') resultMessage = `**${minute}' ✅ PENALTY GOAL!! Cool as ice, straight to the ${direction.toLowerCase()}! LEGEND!** 🧊👑\n\n*CHANCE COMPLETED* ✅`;
    else resultMessage = `**${minute}' ⚽ AMAZING GOAL!! Perfect finish to the ${direction.toLowerCase()}! PURE CLASS!** 🌟💎\n\n*CHANCE COMPLETED* ✅`;
} else {
    if (kind === 'Free Kick') resultMessage = `**${minute}' 😩 OH NO! Free kick ${direction.toLowerCase()} of target! So close to greatness!** 💔\n\n*CHANCE COMPLETED* ✅`;
    else if (kind === 'Penalty') resultMessage = `**${minute}' 🥅 SAVED!! Keeper guessed ${direction.toLowerCase()} perfectly! WHAT A SAVE!** 🔥🧤\n\n*CHANCE COMPLETED* ✅`;
    else resultMessage = `**${minute}' 😱 BLOCKED! Keeper made an INCREDIBLE save going ${direction.toLowerCase()}!** 🛡️⚡\n\n*CHANCE COMPLETED* ✅`;
}

// Update match state
matchState.currentMinute = parseInt(minute);

const embed = createMatchEmbed(matchState, resultMessage);
await interaction.editReply({ embeds: [embed], components: [] });

    // Resolve the promise to continue match
    if (matchState.chanceResolve) {
        matchState.chanceResolve();
    }
};
