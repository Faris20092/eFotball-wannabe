// Global state
let userData = null;
let allPlayers = [];
let ownedPlayerIds = [];
let currentPack = null;
let filteredPlayers = [];

const PACK_EMOJIS = {
    'iconic': '💎',
    'legend': '🏆',
    'standard': '📦'
};

const RARITY_EMOJIS = {
    'Iconic': '💎',
    'Legend': '🌟',
    'Black': '⚫',
    'Gold': '🟡',
    'Silver': '⚪',
    'Bronze': '🟤',
    'White': '⬜'
};

// Initialize
async function init() {
    await loadUserData();
    await loadAllPlayers();
    await loadPacks();
    renderPackSelector();
    document.getElementById('loading').style.display = 'none';
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        userData = data;
        
        // Update UI
        document.getElementById('username').textContent = data.discord.username;
        document.getElementById('userAvatar').src = `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}.png`;
        
        // Get owned player IDs
        if (data.gameData && data.gameData.players) {
            ownedPlayerIds = data.gameData.players.map(p => p.id);
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load all players
async function loadAllPlayers() {
    try {
        const response = await fetch('/api/all-players');
        const data = await response.json();
        allPlayers = data.players || [];
    } catch (error) {
        console.error('Error loading all players:', error);
    }
}

// Load pack data
async function loadPacks() {
    try {
        const response = await fetch('/api/packs');
        const data = await response.json();
        window.packsData = data.packs || {};
    } catch (error) {
        console.error('Error loading packs:', error);
        // Fallback to hardcoded packs if API fails
        window.packsData = {
            'iconic': {
                name: 'Iconic Moment Pack',
                cost: 500,
                currency: 'eCoins',
                description: 'A special pack containing players of all rarities, with a chance to get an Iconic Moment player!',
                rarity_chances: {
                    'Iconic': 0.01,
                    'Legend': 0.03,
                    'Black': 0.10,
                    'Gold': 0.20,
                    'Silver': 0.30,
                    'Bronze': 0.26,
                    'White': 0.10
                }
            },
            'legend': {
                name: 'Legend Box Draw',
                cost: 25000,
                currency: 'GP',
                description: 'A box draw with a chance to get a Legend player!',
                rarity_chances: {
                    'Legend': 0.05,
                    'Black': 0.15,
                    'Gold': 0.25,
                    'Silver': 0.35,
                    'Bronze': 0.20,
                    'White': 0.00
                }
            },
            'standard': {
                name: 'Standard Pack',
                cost: 10000,
                currency: 'GP',
                description: 'A standard pack containing players from Black to White rarity.',
                rarity_chances: {
                    'Black': 0.05,
                    'Gold': 0.20,
                    'Silver': 0.40,
                    'Bronze': 0.25,
                    'White': 0.10
                }
            }
        };
    }
}

// Render pack selector
function renderPackSelector() {
    const container = document.getElementById('packSelector');
    container.innerHTML = '';
    
    for (const [packKey, pack] of Object.entries(window.packsData)) {
        const packCard = document.createElement('div');
        packCard.className = 'pack-card';
        packCard.onclick = () => selectPack(packKey);
        
        const emoji = PACK_EMOJIS[packKey] || '📦';
        
        packCard.innerHTML = `
            <div class="pack-icon">${emoji}</div>
            <div class="pack-name">${pack.name}</div>
            <div class="pack-cost">${pack.cost.toLocaleString()} ${pack.currency}</div>
            <div class="pack-description">${pack.description}</div>
        `;
        
        container.appendChild(packCard);
    }
}

// Select a pack
function selectPack(packKey) {
    currentPack = packKey;
    
    // Update active state
    document.querySelectorAll('.pack-card').forEach((card, index) => {
        const keys = Object.keys(window.packsData);
        if (keys[index] === packKey) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }
    });
    
    // Show pack details
    renderPackDetails(packKey);
    
    // Filter and show players
    filterAndRenderPlayers();
    
    document.getElementById('packDetailsContainer').style.display = 'block';
}

// Render pack details
function renderPackDetails(packKey) {
    const pack = window.packsData[packKey];
    const container = document.getElementById('packDetails');
    
    let rarityHTML = '';
    for (const [rarity, chance] of Object.entries(pack.rarity_chances)) {
        if (chance > 0) {
            const emoji = RARITY_EMOJIS[rarity] || '';
            const percentage = (chance * 100).toFixed(1);
            rarityHTML += `
                <div class="rarity-item">
                    <div class="rarity-name">${emoji} ${rarity}</div>
                    <div class="rarity-chance">${percentage}%</div>
                </div>
            `;
        }
    }
    
    container.innerHTML = `
        <h3>${PACK_EMOJIS[packKey]} ${pack.name}</h3>
        <p style="color: #ccc; margin-bottom: 15px;">${pack.description}</p>
        <p style="color: var(--secondary); font-size: 1.2em; font-weight: bold;">Cost: ${pack.cost.toLocaleString()} ${pack.currency}</p>
        <h4 style="color: #fff; margin-top: 20px; margin-bottom: 10px;">Drop Rates:</h4>
        <div class="rarity-chances">
            ${rarityHTML}
        </div>
    `;
}

// Filter and render players
function filterAndRenderPlayers() {
    if (!currentPack) return;
    
    const pack = window.packsData[currentPack];
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;
    const ownedFilter = document.getElementById('ownedFilter').value;
    
    // Get available rarities in this pack
    const availableRarities = Object.keys(pack.rarity_chances).filter(r => pack.rarity_chances[r] > 0);
    
    // Filter players
    filteredPlayers = allPlayers.filter(player => {
        // Must be in pack's available rarities
        if (!availableRarities.includes(player.rarity)) return false;
        
        // Search filter
        if (searchTerm && !player.name.toLowerCase().includes(searchTerm)) return false;
        
        // Rarity filter
        if (rarityFilter && player.rarity !== rarityFilter) return false;
        
        // Owned filter
        const isOwned = ownedPlayerIds.includes(player.id);
        if (ownedFilter === 'owned' && !isOwned) return false;
        if (ownedFilter === 'not-owned' && isOwned) return false;
        
        return true;
    });
    
    // Update stats
    updateStats();
    
    // Render players
    renderPlayers();
}

// Update statistics
function updateStats() {
    const pack = window.packsData[currentPack];
    const availableRarities = Object.keys(pack.rarity_chances).filter(r => pack.rarity_chances[r] > 0);
    
    const totalInPack = allPlayers.filter(p => availableRarities.includes(p.rarity)).length;
    const ownedInPack = allPlayers.filter(p => availableRarities.includes(p.rarity) && ownedPlayerIds.includes(p.id)).length;
    const notOwnedInPack = totalInPack - ownedInPack;
    const collectionPercent = totalInPack > 0 ? ((ownedInPack / totalInPack) * 100).toFixed(1) : 0;
    
    document.getElementById('playerCount').textContent = filteredPlayers.length;
    document.getElementById('totalPlayers').textContent = totalInPack;
    document.getElementById('ownedPlayers').textContent = ownedInPack;
    document.getElementById('notOwnedPlayers').textContent = notOwnedInPack;
    document.getElementById('collectionPercent').textContent = collectionPercent + '%';
}

// Render players
function renderPlayers() {
    const container = document.getElementById('playersGrid');
    container.innerHTML = '';
    
    if (filteredPlayers.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px; grid-column: 1/-1; text-align: center;">No players found</p>';
        return;
    }
    
    filteredPlayers.forEach(player => {
        const isOwned = ownedPlayerIds.includes(player.id);
        const card = document.createElement('div');
        card.className = `contract-player-card ${isOwned ? 'owned' : ''}`;
        
        // Sanitize player name for image
        const playerImageName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
        const playerImagePng = `/assets/faces/${playerImageName}.png`;
        const playerImageJpg = `/assets/faces/${playerImageName}.jpg`;
        
        card.innerHTML = `
            <div class="player-image-container">
                <div class="player-overall">${player.overall}</div>
                <div class="player-position">${player.position}</div>
                <img src="${playerImagePng}" alt="${player.name}" 
                     onerror="this.onerror=null; this.src='${playerImageJpg}'; this.onerror=function(){this.src='/assets/faces/default_player.png'}">
            </div>
            <div class="player-rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
            <div class="player-name" title="${player.name}">${player.name}</div>
        `;
        
        container.appendChild(card);
    });
}

// Event listeners
document.getElementById('playerSearch').addEventListener('input', filterAndRenderPlayers);
document.getElementById('rarityFilter').addEventListener('change', filterAndRenderPlayers);
document.getElementById('ownedFilter').addEventListener('change', filterAndRenderPlayers);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
