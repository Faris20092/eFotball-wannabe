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

function initializePlayerLevel(player) {
    const rarityConfig = RARITY_CONFIG[player.rarity] || RARITY_CONFIG['White'];
    
    // If player doesn't have level data, initialize it
    if (!player.level) {
        player.level = 1;
        player.exp = 0;
        player.maxLevel = rarityConfig.maxLevel;
        
        // Store original stats as max level stats
        player.maxStats = { ...player.stats };
        player.maxOverall = player.overall;
        
        // Calculate level 1 stats (reduced from current)
        const level1Stats = {};
        for (const [statName, maxStat] of Object.entries(player.maxStats)) {
            // Reduce stats for level 1 (about 70% of max)
            level1Stats[statName] = Math.max(10, Math.floor(maxStat * 0.7));
        }
        
        player.stats = level1Stats;
        
        // Calculate new overall based on level 1 stats
        const statValues = Object.values(level1Stats);
        const avgStat = statValues.reduce((sum, stat) => sum + stat, 0) / statValues.length;
        player.overall = Math.max(30, Math.min(99, Math.floor(avgStat + rarityConfig.overallBonus)));
    }
    
    return player;
}

function updateUserData() {
    const dataDir = path.join(__dirname, '..', 'data');
    
    if (!fs.existsSync(dataDir)) {
        console.log('No data directory found. No user data to update.');
        return;
    }
    
    const files = fs.readdirSync(dataDir).filter(file => file.endsWith('.json'));
    
    if (files.length === 0) {
        console.log('No user data files found.');
        return;
    }
    
    console.log(`Updating ${files.length} user data files...`);
    
    let totalPlayersUpdated = 0;
    
    files.forEach((file, index) => {
        try {
            const filePath = path.join(dataDir, file);
            const userData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (userData.players && Array.isArray(userData.players)) {
                let playersUpdated = 0;
                
                userData.players.forEach(player => {
                    if (!player.level) {
                        initializePlayerLevel(player);
                        playersUpdated++;
                        totalPlayersUpdated++;
                    }
                });
                
                if (playersUpdated > 0) {
                    fs.writeFileSync(filePath, JSON.stringify(userData, null, 2));
                    console.log(`Updated ${playersUpdated} players for user ${userData.id || file}`);
                }
            }
        } catch (error) {
            console.error(`Error updating user data file ${file}:`, error.message);
        }
    });
    
    console.log(`✅ Successfully updated ${totalPlayersUpdated} players across ${files.length} users!`);
}

// Run the update
updateUserData();
