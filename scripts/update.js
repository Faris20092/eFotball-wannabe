const fs = require('fs');

// Rarity-based configuration with randomized max levels
const RARITY_CONFIG = {
    'Iconic': { maxLevelRange: [25, 50], statMultiplier: 1.0, overallBonus: 0 },
    'Legend': { maxLevelRange: [20, 45], statMultiplier: 0.95, overallBonus: -2 },
    'Black': { maxLevelRange: [25, 50], statMultiplier: 0.90, overallBonus: -5 },
    'Gold': { maxLevelRange: [35, 45], statMultiplier: 0.85, overallBonus: -8 },
    'Silver': { maxLevelRange: [45, 55], statMultiplier: 0.80, overallBonus: -12 },
    'Bronze': { maxLevelRange: [40, 60], statMultiplier: 0.75, overallBonus: -16 },
    'White': { maxLevelRange: [30, 60], statMultiplier: 0.70, overallBonus: -20 }
};   // foii"scripts": { "test": "echo \"Error: no test specified\" && exit 1"//},

// Position-based stat priorities
const POSITION_STATS = {
  'GK': {
    primary: ['goalkeeping'],
    secondary: ['defending', 'physicality'],
    tertiary: ['passing'],
    weak: ['attacking', 'dribbling']
  },
  'CB': {
    primary: ['defending', 'physicality'],
    secondary: ['passing'],
    tertiary: ['goalkeeping'],
    weak: ['attacking', 'dribbling']
  },
  'LB': {
    primary: ['defending', 'dribbling'],
    secondary: ['passing', 'physicality'], 
    tertiary: ['attacking'],
    weak: ['goalkeeping']
  },
  'RB': {
    primary: ['defending', 'dribbling'],
    secondary: ['passing', 'physicality'], 
    tertiary: ['attacking'],
    weak: ['goalkeeping']
  },
  'DMF': {
    primary: ['defending', 'passing'],
    secondary: ['physicality', 'dribbling'],
    tertiary: ['attacking'],
    weak: ['goalkeeping']
  },
  'CMF': {
    primary: ['passing', 'dribbling'],
    secondary: ['attacking', 'defending'],
    tertiary: ['physicality'],
    weak: ['goalkeeping']
  },
  'LMF': {
    primary: ['dribbling', 'passing'],
    secondary: ['attacking', 'physicality'],
    tertiary: ['defending'],
    weak: ['goalkeeping']
  },
  'RMF': {
    primary: ['dribbling', 'passing'],
    secondary: ['attacking', 'physicality'],
    tertiary: ['defending'],
    weak: ['goalkeeping']
  },
  'AMF': {
    primary: ['attacking', 'dribbling'],
    secondary: ['passing'],
    tertiary: ['physicality'],
    weak: ['defending', 'goalkeeping']
  },
  'LWF': {
    primary: ['attacking', 'dribbling'],
    secondary: ['passing'],
    tertiary: ['physicality'],
    weak: ['defending', 'goalkeeping']
  },
  'RWF': {
    primary: ['attacking', 'dribbling'],
    secondary: ['passing'],
    tertiary: ['physicality'],
    weak: ['defending', 'goalkeeping']
  },
  'SS': {
    primary: ['attacking', 'dribbling'],
    secondary: ['passing'],
    tertiary: ['physicality'],
    weak: ['defending', 'goalkeeping']
  },
  'CF': {
    primary: ['attacking', 'physicality'],
    secondary: ['dribbling'],
    tertiary: ['passing'],
    weak: ['defending', 'goalkeeping']
  }
};

function getMaxStatRanges(rarity) {
  switch (rarity) {
    case 'Iconic':
      return { primary: [88, 99], secondary: [78, 90], tertiary: [65, 80], weak: [20, 40] };
    case 'Legend':
      return { primary: [85, 96], secondary: [75, 87], tertiary: [60, 75], weak: [18, 38] };
    case 'Black':
      return { primary: [80, 92], secondary: [70, 82], tertiary: [55, 70], weak: [15, 35] };
    case 'Gold':
      return { primary: [75, 87], secondary: [65, 77], tertiary: [50, 65], weak: [15, 35] };
    case 'Silver':
      return { primary: [70, 82], secondary: [60, 72], tertiary: [45, 60], weak: [15, 35] };
    case 'Bronze':
      return { primary: [65, 77], secondary: [55, 67], tertiary: [40, 55], weak: [15, 35] };
    case 'White':
      return { primary: [60, 72], secondary: [50, 62], tertiary: [35, 50], weak: [15, 35] };
    default:
      return { primary: [60, 72], secondary: [50, 62], tertiary: [35, 50], weak: [15, 35] };
  }
}

function getLevel1StatRanges(rarity) {
  switch (rarity) {
    case 'Iconic':
      return { primary: [55, 65], secondary: [45, 55], tertiary: [35, 45], weak: [15, 25] };
    case 'Legend':
      return { primary: [53, 63], secondary: [43, 53], tertiary: [33, 43], weak: [15, 25] };
    case 'Black':
      return { primary: [50, 60], secondary: [40, 50], tertiary: [30, 40], weak: [15, 25] };
    case 'Gold':
      return { primary: [48, 58], secondary: [38, 48], tertiary: [28, 38], weak: [15, 25] };
    case 'Silver':
      return { primary: [45, 55], secondary: [35, 45], tertiary: [25, 35], weak: [15, 25] };
    case 'Bronze':
      return { primary: [43, 53], secondary: [33, 43], tertiary: [23, 33], weak: [15, 25] };
    case 'White':
      return { primary: [40, 50], secondary: [30, 40], tertiary: [20, 30], weak: [15, 25] };
    default:
      return { primary: [40, 50], secondary: [30, 40], tertiary: [20, 30], weak: [15, 25] };
  }
}

function randomInRange(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateStatsForPlayer(player, isMaxLevel = true) {
  const position = player.position;
  const rarity = player.rarity;
  
  // Get position template or default to CMF
  const positionTemplate = POSITION_STATS[position] || POSITION_STATS['CMF'];
  const ranges = isMaxLevel ? getMaxStatRanges(rarity) : getLevel1StatRanges(rarity);
  
  const newStats = {
    attacking: 50,
    dribbling: 50,
    defending: 50,
    passing: 50,
    physicality: 50,
    goalkeeping: 50
  };

  // Assign primary stats (highest)
  positionTemplate.primary.forEach(stat => {
    newStats[stat] = randomInRange(ranges.primary[0], ranges.primary[1]);
  });

  // Assign secondary stats
  positionTemplate.secondary.forEach(stat => {
    newStats[stat] = randomInRange(ranges.secondary[0], ranges.secondary[1]);
  });

  // Assign tertiary stats
  positionTemplate.tertiary.forEach(stat => {
    newStats[stat] = randomInRange(ranges.tertiary[0], ranges.tertiary[1]);
  });

  // Assign weak stats (lowest)
  positionTemplate.weak.forEach(stat => {
    newStats[stat] = randomInRange(ranges.weak[0], ranges.weak[1]);
  });

  return newStats;
}

function calculateOverall(stats, rarity, isMaxLevel = false) {
  // Define overall ranges for each rarity
  const overallRanges = {
    'Iconic': { level1: [87, 94], maxLevel: [94, 105] },
    'Legend': { level1: [85, 88], maxLevel: [90, 100] },
    'Black': { level1: [82, 89], maxLevel: [88, 99] },
    'Gold': { level1: [75, 83], maxLevel: [84, 95] },
    'Silver': { level1: [69, 78], maxLevel: [79, 92] },
    'Bronze': { level1: [60, 69], maxLevel: [74, 89] },
    'White': { level1: [45, 61], maxLevel: [65, 85] }
  };
  
  const ranges = overallRanges[rarity] || overallRanges['White'];
  const targetRange = isMaxLevel ? ranges.maxLevel : ranges.level1;
  
  // Generate random overall within the specified range
  return randomInRange(targetRange[0], targetRange[1]);
}

function updatePlayersStats() {
  try {
    // Read the players.json file
    const playersData = JSON.parse(fs.readFileSync('players.json', 'utf8'));
    
    console.log(`🔄 Updating stats and levels for ${playersData.length} players...`);
    
    // Update each player's stats and level system
    playersData.forEach((player, index) => {
      const rarityConfig = RARITY_CONFIG[player.rarity] || RARITY_CONFIG['White'];
      
      // Generate random max level within rarity range
      const randomMaxLevel = randomInRange(rarityConfig.maxLevelRange[0], rarityConfig.maxLevelRange[1]);
      
      // Generate max level stats
      const maxStats = generateStatsForPlayer(player, true);
      const maxOverall = calculateOverall(maxStats, player.rarity, true);
      
      // Generate level 1 stats
      const level1Stats = generateStatsForPlayer(player, false);
      const level1Overall = calculateOverall(level1Stats, player.rarity, false);
      
      // Update player with level system
      player.level = 1;
      player.exp = 0;
      player.maxLevel = randomMaxLevel;
      player.stats = level1Stats;
      player.overall = level1Overall;
      player.maxStats = maxStats;
      player.maxOverall = maxOverall;
      
      // Log the changes for first few players as examples
      if (index < 5) {
        console.log(`\n✅ ${player.name} (${player.position}, ${player.rarity})`);
        console.log(`   Level 1 Overall: ${level1Overall} | Max Overall: ${maxOverall}`);
        console.log(`   Max Level: ${player.maxLevel}`);
        console.log(`   Level 1 Stats: ATT:${level1Stats.attacking} DRI:${level1Stats.dribbling} DEF:${level1Stats.defending} PAS:${level1Stats.passing} PHY:${level1Stats.physicality} GK:${level1Stats.goalkeeping}`);
        console.log(`   Max Stats: ATT:${maxStats.attacking} DRI:${maxStats.dribbling} DEF:${maxStats.defending} PAS:${maxStats.passing} PHY:${maxStats.physicality} GK:${maxStats.goalkeeping}`);
      }
    });
    
    // Create backup of original file
    const backupName = `players_backup_${Date.now()}.json`;
    fs.writeFileSync(backupName, fs.readFileSync('players.json'));
    console.log(`\n📂 Backup created: ${backupName}`);
    
    // Write updated data back to file
    fs.writeFileSync('players.json', JSON.stringify(playersData, null, 2));
    
    console.log(`\n🎉 Successfully updated stats and levels for all ${playersData.length} players!`);
    console.log(`💾 Updated file saved as players.json`);
    
    // Show some statistics
    const rarityStats = {};
    let totalLevel1Overall = 0;
    let minLevel1Overall = 99;
    let maxLevel1Overall = 0;
    
    playersData.forEach(player => {
      if (!rarityStats[player.rarity]) {
        rarityStats[player.rarity] = { count: 0, avgLevel1: 0, avgMaxLevel: 0, avgLevel1Overall: 0 };
      }
      rarityStats[player.rarity].count++;
      rarityStats[player.rarity].avgMaxLevel += player.maxLevel;
      rarityStats[player.rarity].avgLevel1Overall += player.overall;
      
      totalLevel1Overall += player.overall;
      minLevel1Overall = Math.min(minLevel1Overall, player.overall);
      maxLevel1Overall = Math.max(maxLevel1Overall, player.overall);
    });
    
    console.log('\n📊 Update Statistics:');
    console.log(`   Overall Level 1 Range: ${minLevel1Overall} - ${maxLevel1Overall}`);
    console.log(`   Average Level 1 Overall: ${Math.round(totalLevel1Overall / playersData.length)}`);
    
    Object.entries(rarityStats).forEach(([rarity, stats]) => {
      const avgOverall = Math.round(stats.avgLevel1Overall / stats.count);
      const avgMaxLevel = Math.round(stats.avgMaxLevel / stats.count);
      console.log(`   ${rarity}: ${stats.count} players, Avg Level 1 Overall: ${avgOverall}, Max Level: ${avgMaxLevel}`);
    });
    
  } catch (error) {
    console.error('❌ Error updating player stats:', error.message);
  }
}

// Run the update
updatePlayersStats();