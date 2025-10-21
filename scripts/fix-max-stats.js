const fs = require('fs');
const path = require('path');

// Import the same stat priorities and calculations from training.js
const POSITION_STAT_PRIORITY = {
    'GK': { goalkeeping: 2.0, defending: 1.2, physicality: 1.1 },
    'CB': { defending: 1.8, physicality: 1.4, passing: 1.1 },
    'LB': { defending: 1.5, physicality: 1.2, passing: 1.3, dribbling: 1.1 },
    'RB': { defending: 1.5, physicality: 1.2, passing: 1.3, dribbling: 1.1 },
    'DMF': { defending: 1.6, physicality: 1.3, passing: 1.2 },
    'CMF': { passing: 1.4, physicality: 1.2, defending: 1.1, attacking: 1.1, dribbling: 1.1 },
    'AMF': { passing: 1.3, attacking: 1.4, dribbling: 1.3 },
    'LMF': { passing: 1.2, dribbling: 1.4, physicality: 1.1, attacking: 1.1 },
    'RMF': { passing: 1.2, dribbling: 1.4, physicality: 1.1, attacking: 1.1 },
    'CF': { attacking: 1.6, dribbling: 1.2, physicality: 1.3 },
    'LWF': { attacking: 1.4, dribbling: 1.5, passing: 1.1 },
    'RWF': { attacking: 1.4, dribbling: 1.5, passing: 1.1 }
};

function calculateTargetOverall(stats, position) {
    // Weight stats based on position importance (same as training.js)
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

function adjustStatsToMatchOverall(currentStats, targetOverall, position) {
    const positionPriority = POSITION_STAT_PRIORITY[position] || POSITION_STAT_PRIORITY['CMF'];
    const currentOverall = calculateTargetOverall(currentStats, position);
    
    if (Math.abs(currentOverall - targetOverall) <= 1) {
        return currentStats; // Already close enough
    }
    
    const adjustedStats = { ...currentStats };
    const difference = targetOverall - currentOverall;
    
    // Get stats sorted by position importance (most important first)
    const statsByImportance = Object.entries(positionPriority)
        .filter(([statName]) => statName !== 'goalkeeping' || position === 'GK')
        .sort((a, b) => b[1] - a[1])
        .map(([statName]) => statName);
    
    // Distribute the difference across stats based on importance
    let remainingDifference = difference;
    const adjustmentPerStat = Math.ceil(Math.abs(difference) / statsByImportance.length);
    
    for (const statName of statsByImportance) {
        if (remainingDifference === 0) break;
        
        const currentValue = adjustedStats[statName];
        const adjustment = Math.sign(remainingDifference) * Math.min(adjustmentPerStat, Math.abs(remainingDifference));
        const newValue = Math.max(10, Math.min(99, currentValue + adjustment));
        
        adjustedStats[statName] = newValue;
        remainingDifference -= (newValue - currentValue);
    }
    
    return adjustedStats;
}

function fixMaxStats() {
    const playersPath = path.join(__dirname, '..', 'players.json');
    const players = JSON.parse(fs.readFileSync(playersPath, 'utf8'));
    
    console.log(`Processing ${players.length} players...`);
    
    let fixed = 0;
    let unchanged = 0;
    let skipped = 0;
    
    for (const player of players) {
        // Skip Lionel Messi
        if (player.name === 'Lionel Messi★') {
            console.log(`Skipped ${player.name} (special case)`);
            skipped++;
            continue;
        }
        
        // Only process players that have maxStats and maxOverall
        if (!player.maxStats || !player.maxOverall) {
            unchanged++;
            continue;
        }
        
        const currentOverall = calculateTargetOverall(player.maxStats, player.position);
        const targetOverall = player.maxOverall;
        
        if (Math.abs(currentOverall - targetOverall) > 1) {
            const oldMaxStats = { ...player.maxStats };
            player.maxStats = adjustStatsToMatchOverall(player.maxStats, targetOverall, player.position);
            const newOverall = calculateTargetOverall(player.maxStats, player.position);
            
            console.log(`Fixed ${player.name} (${player.position}) maxStats: ${currentOverall} → ${newOverall} (target: ${targetOverall})`);
            fixed++;
        } else {
            unchanged++;
        }
    }
    
    // Write back to file
    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
    
    console.log(`\nCompleted:`);
    console.log(`- Fixed maxStats: ${fixed} players`);
    console.log(`- Unchanged: ${unchanged} players`);
    console.log(`- Skipped (Messi): ${skipped} players`);
    console.log(`- Total: ${players.length} players`);
}

// Run the fix
fixMaxStats();
