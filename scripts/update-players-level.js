const fs = require('fs');
const path = require('path');

// Rarity-based configuration
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

function calculateOverall(stats, rarity) {
    const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG['White'];
    
    // Calculate base overall from stats (excluding goalkeeping for outfield players)
    const statEntries = Object.entries(stats);
    const relevantStats = statEntries.filter(([name]) => name !== 'goalkeeping' || stats.goalkeeping > 50);
    const avgStat = relevantStats.reduce((sum, [, stat]) => sum + stat, 0) / relevantStats.length;
    
    // Apply rarity bonus
    let overall = Math.floor(avgStat + rarityConfig.overallBonus);
    
    // Add some randomness for variety (±2)
    overall += Math.floor(Math.random() * 5) - 2;
    
    // Ensure overall is within reasonable bounds
    return Math.max(30, Math.min(99, overall));
}

function calculateLevel1Stats(maxStats, position, playingStyle, rarity) {
    const rarityConfig = RARITY_CONFIG[rarity] || RARITY_CONFIG['White'];
    const positionPriority = POSITION_STAT_PRIORITY[position] || POSITION_STAT_PRIORITY['CMF'];
    const styleBonuses = PLAYSTYLE_BONUSES[playingStyle] || {};
    
    const level1Stats = {};
    
    for (const [statName, maxStat] of Object.entries(maxStats)) {
        const positionMultiplier = positionPriority[statName] || 1.0;
        const styleMultiplier = styleBonuses[statName] || 1.0;
        const rarityMultiplier = rarityConfig.statMultiplier;
        
        // Calculate level 1 stat (reduced from max level)
        // Higher priority stats start closer to max, lower priority stats start much lower
        let reductionFactor;
        if (positionMultiplier >= 1.5) {
            reductionFactor = 0.75; // Important stats start at 75% of max
        } else if (positionMultiplier >= 1.0) {
            reductionFactor = 0.65; // Normal stats start at 65% of max
        } else {
            reductionFactor = 0.50; // Unimportant stats start at 50% of max
        }
        
        // Apply style bonuses to reduction factor
        if (styleMultiplier > 1.0) {
            reductionFactor += 0.05; // Slightly higher starting point for style bonuses
        }
        
        // Add some randomness (±5%)
        const randomFactor = (Math.random() * 0.1) - 0.05;
        reductionFactor = Math.max(0.4, Math.min(0.8, reductionFactor + randomFactor));
        
        level1Stats[statName] = Math.max(10, Math.min(85, Math.floor(maxStat * reductionFactor)));
    }
    
    return level1Stats;
}

function updatePlayersWithLevels() {
    const playersPath = path.join(__dirname, '..', 'players.json');
    
    console.log('Reading players.json...');
    const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
    
    console.log(`Updating ${players.length} players with level system...`);
    
    const updatedPlayers = players.map((player, index) => {
        if (index % 1000 === 0) {
            console.log(`Processing player ${index + 1}/${players.length}...`);
        }
        
        const rarityConfig = RARITY_CONFIG[player.rarity] || RARITY_CONFIG['White'];
        
        // Store current stats and overall as max level values
        const maxStats = { ...player.stats };
        const maxOverall = player.overall;
        
        // Calculate level 1 stats
        const level1Stats = calculateLevel1Stats(maxStats, player.position, player.playingStyle, player.rarity);
        const level1Overall = calculateOverall(level1Stats, player.rarity);
        
        // Update player with level system
        return {
            ...player,
            level: 1,
            exp: 0,
            maxLevel: rarityConfig.maxLevel,
            stats: level1Stats,
            overall: level1Overall,
            maxStats: maxStats,
            maxOverall: maxOverall
        };
    });
    
    console.log('Writing updated players.json...');
    fs.writeFileSync(playersPath, JSON.stringify(updatedPlayers, null, 2));
    
    console.log('✅ Successfully updated all players with level system!');
    
    // Print some statistics
    const rarityStats = {};
    updatedPlayers.forEach(player => {
        if (!rarityStats[player.rarity]) {
            rarityStats[player.rarity] = { count: 0, avgLevel1Overall: 0, avgMaxLevel: 0 };
        }
        rarityStats[player.rarity].count++;
        rarityStats[player.rarity].avgLevel1Overall += player.overall;
        rarityStats[player.rarity].avgMaxLevel += player.maxLevel;
    });
    
    console.log('\n📊 Update Statistics:');
    for (const [rarity, stats] of Object.entries(rarityStats)) {
        const avgOverall = Math.round(stats.avgLevel1Overall / stats.count);
        const avgMaxLevel = Math.round(stats.avgMaxLevel / stats.count);
        console.log(`${rarity}: ${stats.count} players, Avg Level 1 Overall: ${avgOverall}, Max Level: ${avgMaxLevel}`);
    }
}

// Run the update
updatePlayersWithLevels();
