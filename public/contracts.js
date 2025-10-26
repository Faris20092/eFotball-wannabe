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

// Define packs (Iconic, Legend, Standard only)
const PACKS_CONFIG = {
    'iconic': {
        name: 'Iconic Pack',
        description: 'Limited run pack featuring Iconic stars plus Black-to-White support cards.',
        rarity_chances: {
            'Iconic': 0.12,
            'Black': 0.15,
            'Gold': 0.18,
            'Silver': 0.20,
            'Bronze': 0.15,
            'White': 0.20
        }
    },
    'legend': {
        name: 'Legend Pack',
        description: 'Great chance for Legend and Black players',
        rarity_chances: {
            'Legend': 0.25,
            'Black': 0.40,
            'Gold': 0.25,
            'Silver': 0.08,
            'Bronze': 0.02
        }
    },
    'standard': {
        name: 'Standard Pack',
        description: 'Standard pack with all rarities',
        rarity_chances: {
            'Black': 0.10,
            'Gold': 0.30,
            'Silver': 0.35,
            'Bronze': 0.20,
            'White': 0.05
        }
    }
};

// Initialize
async function init() {
    await loadUserData();
    await loadAllPlayers();
    await loadPacks(); // Load API pack data
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
        console.log('Loading packs from API...');
        const response = await fetch('/api/packs');
        const data = await response.json();
        console.log('API response:', data);

        window.packsData = data.packs || {};
        console.log('Loaded packs:', Object.keys(window.packsData));

        // Verify Iconic pack data
        if (window.packsData.iconic) {
            console.log('Iconic pack data:', window.packsData.iconic);
        } else {
            console.error('Iconic pack not found in API response');
        }
    } catch (error) {
        console.error('Error loading packs:', error);
        // Use fallback data if API fails
        window.packsData = {
            'iconic': {
                name: 'Iconic Moment Pack',
                cost: 500,
                currency: 'eCoins',
                description: 'Limited run pack featuring Iconic stars plus Black-to-White support cards.',
                rarity_chances: {
                    'Iconic': 0.12,
                    'Black': 0.15,
                    'Gold': 0.18,
                    'Silver': 0.20,
                    'Bronze': 0.15,
                    'White': 0.20
                }
            },
            'legend': {
                name: 'Legend Box Draw',
                cost: 25000,
                currency: 'GP',
                description: 'A box draw with a strong emphasis on Legend players.',
                rarity_chances: {
                    'Legend': 0.05,
                    'Black': 0.15,
                    'Gold': 0.25,
                    'Silver': 0.35,
                    'Bronze': 0.20,
                    'White': 0.0
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
        console.log('Using fallback pack data');
    }
}

// Show pack details (called from HTML onclick)
function showPackDetails(packKey) {
    console.log('showPackDetails called with:', packKey);
    console.log('Available packs in API:', window.packsData ? Object.keys(window.packsData) : 'API data not loaded');
    console.log('Pack config available:', Object.keys(PACKS_CONFIG));

    if (!window.packsData || !window.packsData[packKey]) {
        console.error('Pack not found in API data:', packKey);
        console.error('Available API packs:', window.packsData ? Object.keys(window.packsData) : 'No API data');
        return;
    }

    if (!PACKS_CONFIG[packKey]) {
        console.error('Pack config not found:', packKey);
        return;
    }

    currentPack = packKey;

    // Show pack details
    renderPackDetails(packKey);

    // Filter and render players
    filterAndRenderPlayers();

    document.getElementById('packDetailsContainer').style.display = 'block';

    // Scroll to details
    document.getElementById('packDetailsContainer').scrollIntoView({ behavior: 'smooth' });
}

// Make function globally accessible
window.showPackDetails = showPackDetails;

// Render pack details
function renderPackDetails(packKey) {
    const pack = window.packsData[packKey];
    if (!pack) {
        console.error('Pack not found:', packKey);
        return;
    }

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

    // Add Iconic pack limit info
    let limitInfo = '';
    if (packKey === 'iconic') {
        const packConfig = PACKS_CONFIG[packKey];
        if (packConfig && packConfig.limit) {
            limitInfo = `<p style="color: var(--secondary); font-size: 1.1em; margin-top: 15px;">📦 Limited Edition: ${packConfig.limit} players only</p>`;
        }
    }

    container.innerHTML = `
        <h3>${PACK_EMOJIS[packKey]} ${pack.name}</h3>
        <p style="color: #ccc; margin-bottom: 15px;">${pack.description}</p>
        ${limitInfo}
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
    const packConfig = PACKS_CONFIG[currentPack];

    if (!pack || !packConfig) {
        console.error('Pack data not found for:', currentPack);
        return;
    }

    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;
    const ownedFilter = document.getElementById('ownedFilter').value;

    // Get available rarities in this pack
    const availableRarities = Object.keys(packConfig.rarity_chances).filter(r => packConfig.rarity_chances[r] > 0);

    // Filter players
    let filteredPlayers = allPlayers.filter(player => {
        // Must be in pack's available rarities
        if (!availableRarities.includes(player.rarity)) return false;

        // For Iconic pack, must be in the curated player pool
        if (currentPack === 'iconic' && pack.playerPool) {
            if (!pack.playerPool.includes(player.id)) return false;
        }

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

    // Update filteredPlayers for rendering
    filteredPlayers = filteredPlayers;

    // Update stats
    updateStats();

    // Render players
    renderPlayers();
}

// Update statistics
function updateStats() {
    const pack = window.packsData[currentPack];
    const packConfig = PACKS_CONFIG[currentPack];

    if (!pack || !packConfig) return;

    const availableRarities = Object.keys(packConfig.rarity_chances).filter(r => packConfig.rarity_chances[r] > 0);

    // Filter function for Iconic pack player pool
    const isPlayerInPack = (player) => {
        // Must be in pack's available rarities
        if (!availableRarities.includes(player.rarity)) return false;

        // For Iconic pack, must be in the curated player pool
        if (currentPack === 'iconic' && pack.playerPool) {
            if (!pack.playerPool.includes(player.id)) return false;
        }

        return true;
    };

    const totalInPack = allPlayers.filter(isPlayerInPack).length;
    const ownedInPack = allPlayers.filter(p => isPlayerInPack(p) && ownedPlayerIds.includes(p.id)).length;
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
        card.dataset.rarity = player.rarity;
        card.onclick = () => showPlayerDetails(player);
        card.style.cursor = 'pointer';
        
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

// Show player details modal
function showPlayerDetails(player) {
    const modal = document.getElementById('playerModal');
    const content = document.getElementById('playerModalContent');
    
    const stats = player.stats || {};
    const isOwned = ownedPlayerIds.includes(player.id);
    
    // Get player full image path (240x340 images)
    const sanitizedName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
    const playerImagePath = `/assets/playerimages/${sanitizedName}.png`;
    
    // Rarity icons
    const rarityIcons = {
        'Iconic': '💎',
        'Legend': '🌟',
        'Black': '⚫',
        'Gold': '🟡',
        'Silver': '⚪',
        'Bronze': '🟤'
    };
    
    content.innerHTML = `
        <div class="player-detail-container">
            <div class="player-detail-left">
                <div class="player-detail-card">
                    <div class="player-card-position">${player.position}</div>
                    <div class="player-card-rating">${player.overall}</div>
                    <div class="player-card-rarity">${rarityIcons[player.rarity] || '⚽'}</div>
                    <div class="player-card-rarity-bottom">${player.rarity}</div>
                    <img src="${playerImagePath}" alt="${player.name}" class="player-detail-image" 
                         onerror="this.src='/assets/playerimages/default_player.png'">
                </div>
                ${isOwned ? '<p style="color: #27ae60; font-weight: bold; text-align: center; margin-top: 15px;">✓ You own this player</p>' : '<p style="color: #999; text-align: center; margin-top: 15px;">You don\'t own this player yet</p>'}
            </div>
            <div class="player-detail-right">
                <div class="player-detail-header">
                    <div class="player-detail-info">
                        <div class="player-detail-row">
                            <span class="player-detail-label">Overall:</span>
                            <span class="player-detail-value">${player.overall}</span>
                        </div>
                        <div class="player-detail-row">
                            <span class="player-detail-label">Position:</span>
                            <span class="player-detail-value">${player.position}</span>
                        </div>
                    </div>
                    <div class="player-detail-info">
                        <div class="player-detail-row">
                            <span class="player-detail-label">Rarity:</span>
                            <span class="player-detail-value">${player.rarity}</span>
                        </div>
                        <div class="player-detail-row">
                            <span class="player-detail-label">Style:</span>
                            <span class="player-detail-value">${player.playingStyle || 'N/A'}</span>
                        </div>
                    </div>
                </div>
                
                <h3 class="player-detail-section-title">Stats</h3>
                <div class="player-detail-stats">
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚔️</span>
                        <span class="stat-label">Attacking:</span>
                        <span class="stat-value">${stats.attacking || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🎯</span>
                        <span class="stat-label">Dribbling:</span>
                        <span class="stat-value">${stats.dribbling || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">⚽</span>
                        <span class="stat-label">Passing:</span>
                        <span class="stat-value">${stats.passing || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🛡️</span>
                        <span class="stat-label">Defending:</span>
                        <span class="stat-value">${stats.defending || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">💪</span>
                        <span class="stat-label">Physicality:</span>
                        <span class="stat-value">${stats.physicality || 0}</span>
                    </div>
                    <div class="player-detail-stat">
                        <span class="stat-icon">🧤</span>
                        <span class="stat-label">Goalkeeping:</span>
                        <span class="stat-value">${stats.goalkeeping || 0}</span>
                    </div>
                </div>
                
                ${player.skills && player.skills.length > 0 ? `
                    <h3 class="player-detail-section-title">Skills</h3>
                    <div class="player-detail-skills">${player.skills.slice(0, 5).join(', ')}</div>
                ` : ''}
            </div>
        </div>
    `;
    
    modal.classList.add('active');
    modal.style.display = 'flex';
}

// Close modal
function closeModal() {
    const modal = document.getElementById('playerModal');
    modal.classList.remove('active');
    modal.style.display = 'none';
}

// Make function globally accessible
window.closeModal = closeModal;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    // Event listeners
    document.getElementById('playerSearch').addEventListener('input', filterAndRenderPlayers);
    document.getElementById('rarityFilter').addEventListener('change', filterAndRenderPlayers);
    document.getElementById('ownedFilter').addEventListener('change', filterAndRenderPlayers);
    
    // Close modal on outside click
    window.onclick = function(event) {
        const modal = document.getElementById('playerModal');
        if (event.target === modal) {
            closeModal();
        }
    };
    
    // Initialize
    init();
});
