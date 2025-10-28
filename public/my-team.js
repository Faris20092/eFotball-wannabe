// Global state
let userData = null;
let allPlayers = [];
let currentSquad = { main: [], bench: [] };
let currentFormation = '4-3-3';
let availablePlayersList = [];
let autoScrollInterval = null;

const FORMATIONS = {
    '4-3-3': ['GK', 'LB', 'CB', 'CB', 'RB', 'CMF', 'CMF', 'CMF', 'LWF', 'CF', 'RWF'],
    '4-4-2': ['GK', 'LB', 'CB', 'CB', 'RB', 'LMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
    '3-5-2': ['GK', 'CB', 'CB', 'CB', 'LMF', 'CMF', 'CMF', 'CMF', 'RMF', 'CF', 'CF'],
    '4-2-3-1': ['GK', 'LB', 'CB', 'CB', 'RB', 'DMF', 'DMF', 'AMF', 'AMF', 'AMF', 'CF']
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

// Initialize dashboard
async function init() {
    await loadUserData();
    await loadPlayers();
    await loadSquad(); // This now handles rendering internally
    renderAllPlayers();
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
        
        if (data.gameData) {
            document.getElementById('gpAmount').textContent = (data.gameData.gp || 0).toLocaleString();
            document.getElementById('eCoinsAmount').textContent = data.gameData.eCoins || 0;
            document.getElementById('playerCount').textContent = (data.gameData.players || []).length;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load players
async function loadPlayers() {
    try {
        const response = await fetch('/api/players');
        const data = await response.json();
        allPlayers = data.players || [];
        availablePlayersList = [...allPlayers];
    } catch (error) {
        console.error('Error loading players:', error);
    }
}

// Load squad
async function loadSquad() {
    try {
        const response = await fetch('/api/squad');
        const data = await response.json();
        currentSquad = data.squad || { main: [], bench: [] };
        
        currentFormation = data.formation || '4-3-3';
        document.getElementById('formationSelect').value = currentFormation;
        
        // CRITICAL: Remove duplicates from loaded squad
        const hadDuplicates = cleanupDuplicates();
        
        // If duplicates were found and removed, auto-save the cleaned squad
        if (hadDuplicates) {
            console.log('Duplicates detected and removed. Auto-saving cleaned squad...');
            await saveSquad(true); // Silent save
        }
        
        // FORCE RE-RENDER after cleanup
        renderSquadPitch();
        renderAvailablePlayers();
        calculateTeamRating();
    } catch (error) {
        console.error('Error loading squad:', error);
    }
}

// Clean up duplicate players in squad
function cleanupDuplicates() {
    const seenIds = new Set();
    const cleanMain = [];
    let foundDuplicates = false;
    
    // Clean main squad - keep first occurrence, remove duplicates
    for (let i = 0; i < currentSquad.main.length; i++) {
        const playerId = currentSquad.main[i];
        
        if (playerId === null || playerId === undefined) {
            cleanMain.push(null);
        } else if (!seenIds.has(playerId)) {
            seenIds.add(playerId);
            cleanMain.push(playerId);
        } else {
            // Duplicate found - replace with null
            console.warn(`Duplicate player ${playerId} found at position ${i}, removing...`);
            cleanMain.push(null);
            foundDuplicates = true;
        }
    }
    
    // Clean bench - remove duplicates and players already in main squad
    const cleanBench = [];
    for (const playerId of currentSquad.bench) {
        if (playerId !== null && playerId !== undefined && !seenIds.has(playerId)) {
            seenIds.add(playerId);
            cleanBench.push(playerId);
        } else if (playerId !== null && playerId !== undefined) {
            console.warn(`Duplicate player ${playerId} found in bench, removing...`);
            foundDuplicates = true;
        }
    }
    
    // Update squad with cleaned data
    currentSquad.main = cleanMain;
    currentSquad.bench = cleanBench.slice(0, 8); // Enforce 8 player limit
    
    if (foundDuplicates) {
        console.log('Squad cleaned - duplicates removed:', {
            main: cleanMain.filter(id => id !== null).length,
            bench: cleanBench.length
        });
    }
    
    return foundDuplicates;
}

// Calculate team rating
function calculateTeamRating() {
    const mainPlayers = currentSquad.main.filter(id => id !== null);
    if (mainPlayers.length === 0) {
        document.getElementById('teamRating').textContent = '0';
        return;
    }
    
    let totalRating = 0;
    let count = 0;
    
    mainPlayers.forEach(playerId => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
            totalRating += player.overall;
            count++;
        }
    });
    
    const avgRating = count > 0 ? Math.round(totalRating / count) : 0;
    document.getElementById('teamRating').textContent = avgRating;
}

// Render squad pitch
function renderSquadPitch() {
    const pitch = document.getElementById('squadPitch');
    const positions = FORMATIONS[currentFormation];
    
    // Group positions by rows
    const rows = {
        'GK': [positions[0]],
        'DEF': positions.slice(1, 5).filter(p => p.includes('B')),
        'MID': positions.filter(p => p.includes('MF')),
        'ATT': positions.filter(p => p.includes('WF') || p === 'CF')
    };
    
    pitch.innerHTML = '';
    
    // Render from attack to defense
    ['ATT', 'MID', 'DEF', 'GK'].forEach(line => {
        if (rows[line] && rows[line].length > 0) {
            const row = document.createElement('div');
            row.className = 'squad-row';
            
            // Track which indices we've already used to avoid duplicates
            const usedIndices = new Set();
            
            rows[line].forEach((position, idx) => {
                // Find the NEXT occurrence of this position that we haven't used yet
                let posIndex = -1;
                for (let i = 0; i < positions.length; i++) {
                    if (positions[i] === position && !usedIndices.has(i)) {
                        posIndex = i;
                        usedIndices.add(i);
                        break;
                    }
                }
                
                if (posIndex === -1) return; // Skip if not found
                
                const playerId = currentSquad.main[posIndex];
                const player = playerId ? allPlayers.find(p => p.id === playerId) : null;
                
                const slot = document.createElement('div');
                slot.className = player ? 'player-slot filled' : 'player-slot';
                slot.dataset.position = posIndex;
                
                // Add drag and drop events
                slot.draggable = player ? true : false;
                if (player) {
                    slot.dataset.playerId = player.id;
                    slot.dataset.rarity = player.rarity;
                    slot.addEventListener('dragstart', handleDragStart);
                    slot.addEventListener('dragend', handleDragEnd);
                    
                    // Get player image from local assets - try multiple formats
                    // Sanitize player name: lowercase, replace non-alphanumeric with _, collapse multiple _, trim trailing _
                    const playerImageName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
                    const playerImagePng = `/assets/faces/${playerImageName}.png`;
                    const playerImageJpg = `/assets/faces/${playerImageName}.jpg`;
                    
                    slot.innerHTML = `
                        <div class="pitch-card">
                            <div class="pitch-card-rating">${player.overall}</div>
                            <div class="pitch-card-position">${position}</div>
                            <div class="pitch-card-image">
                                <img src="${playerImagePng}" alt="${player.name}" 
                                     onerror="this.onerror=null; this.src='${playerImageJpg}'; this.onerror=function(){this.src='/assets/faces/default_player.png'}">
                            </div>
                            <div class="pitch-card-name">${player.name}</div>
                            <div class="pitch-card-stats">
                                <span class="stat-badge">${RARITY_EMOJIS[player.rarity] || '⚽'}</span>
                            </div>
                        </div>
                    `;
                } else {
                    slot.onclick = () => openPlayerSelector(posIndex);
                    slot.innerHTML = `
                        <div class="pitch-card-empty">
                            <div class="empty-position">${position}</div>
                            <div class="empty-text">Click to add</div>
                        </div>
                    `;
                }
                
                slot.addEventListener('dragover', handleDragOver);
                slot.addEventListener('drop', handleDrop);
                slot.addEventListener('dragleave', handleDragLeave);
                
                row.appendChild(slot);
            });
            
            pitch.appendChild(row);
        }
    });
    
    renderBench();
}

// Render bench
function renderBench() {
    const benchContainer = document.getElementById('benchPlayers');
    benchContainer.innerHTML = '';
    
    if (!currentSquad.bench || currentSquad.bench.length === 0) {
        benchContainer.innerHTML = '<p style="color: #999;">No bench players</p>';
        return;
    }
    
    currentSquad.bench.forEach((playerId, idx) => {
        const player = allPlayers.find(p => p.id === playerId);
        if (player) {
            const benchPlayer = document.createElement('div');
            benchPlayer.className = 'bench-player';
            benchPlayer.draggable = true;
            benchPlayer.dataset.playerId = player.id;
            benchPlayer.dataset.rarity = player.rarity;
            benchPlayer.dataset.benchIndex = idx;
            benchPlayer.dataset.source = 'bench';
            
            // Add drag events for bench players
            benchPlayer.addEventListener('dragstart', handleBenchDragStart);
            benchPlayer.addEventListener('dragend', handleDragEnd);
            benchPlayer.addEventListener('dragover', handleDragOver);
            benchPlayer.addEventListener('drop', handleBenchDrop);
            benchPlayer.addEventListener('dragleave', handleDragLeave);
            
            benchPlayer.onclick = () => showPlayerDetails(player);
            
            // Sanitize player name: lowercase, replace non-alphanumeric with _, collapse multiple _, trim trailing _
            const playerImageName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
            const playerImagePng = `/assets/faces/${playerImageName}.png`;
            const playerImageJpg = `/assets/faces/${playerImageName}.jpg`;
            
            benchPlayer.innerHTML = `
                <div class="bench-card-rating">${player.overall}</div>
                <div class="bench-card-position">${player.position}</div>
                <div class="bench-card-image">
                    <img src="${playerImagePng}" alt="${player.name}" 
                         onerror="this.onerror=null; this.src='${playerImageJpg}'; this.onerror=function(){this.src='/assets/faces/default_player.png'}">
                </div>
                <div class="bench-card-name">${player.name}</div>
            `;
            benchContainer.appendChild(benchPlayer);
        }
    });
}

function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayers');
    container.innerHTML = '';
    
    // Filter out players already in squad or bench
    const usedPlayerIds = [
        ...currentSquad.main.filter(id => id !== null),
        ...currentSquad.bench.filter(id => id !== null)
    ];
    const available = availablePlayersList.filter(p => !usedPlayerIds.includes(p.id));
    
    if (available.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">No available players</p>';
        return;
    }
    
    available.forEach(player => {
        const card = document.createElement('div');
        card.className = 'available-player-card';
        card.draggable = true;
        card.dataset.playerId = player.id;
        card.dataset.rarity = player.rarity;
        
        // Add drag events
        card.addEventListener('dragstart', (e) => {
            draggedPlayerId = player.id;
            draggedFromPosition = null;
            draggedFromBench = false;
            card.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            startAutoScroll(e);
        });
        
        card.addEventListener('dragend', (e) => {
            card.classList.remove('dragging');
            stopAutoScroll();
        });
        
        card.onclick = () => showPlayerDetails(player);
        
        // Sanitize player name: lowercase, replace non-alphanumeric with _, collapse multiple _, trim trailing _
        const playerImageName = player.name.replace(/[^a-zA-Z0-9\-_]/g, '_').toLowerCase().replace(/_+/g, '_').replace(/_+$/g, '');
        const playerImagePng = `/assets/faces/${playerImageName}.png`;
        const playerImageJpg = `/assets/faces/${playerImageName}.jpg`;
        
        card.innerHTML = `
            <div class="available-card-rating">${player.overall}</div>
            <div class="available-card-position">${player.position}</div>
            <div class="available-card-rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
            <div class="available-card-image">
                <img src="${playerImagePng}" alt="${player.name}" 
                     onerror="this.onerror=null; this.src='${playerImageJpg}'; this.onerror=function(){this.src='/assets/faces/default_player.png'}">
            </div>
            <div class="available-card-name">${player.name}</div>
        `;
        
        container.appendChild(card);
    });
}

// Render all players
function renderAllPlayers() {
    const container = document.getElementById('allPlayersGrid');
    container.innerHTML = '';
    
    if (allPlayers.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">No players in collection</p>';
        return;
    }
    
    allPlayers.forEach(player => {
        const card = createPlayerCard(player, () => showPlayerDetails(player));
        container.appendChild(card);
    });
}

// Show player details modal
function showPlayerDetails(player) {
    const modal = document.getElementById('playerModal');
    const content = document.getElementById('playerModalContent');
    
    const stats = player.stats || {};
    
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
                <div class="player-detail-card" data-rarity="${player.rarity}">
                    <div class="player-card-position">${player.position}</div>
                    <div class="player-card-rating">${player.overall}</div>
                    <div class="player-card-rarity">${rarityIcons[player.rarity] || '⚽'}</div>
                    <div class="player-card-rarity-bottom">${player.rarity}</div>
                    <img src="${playerImagePath}" alt="${player.name}" class="player-detail-image" 
                         onerror="this.src='/assets/playerimages/default_player.png'">
                </div>
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

// Open player selector for position
let selectedPosition = null;

function openPlayerSelector(positionIndex) {
    selectedPosition = positionIndex;
    
    // Show available players filtered by position
    const requiredPos = FORMATIONS[currentFormation][positionIndex];
    
    // Get all used player IDs (filter out null and undefined)
    const usedPlayerIds = [
        ...currentSquad.main.filter(id => id !== null && id !== undefined),
        ...currentSquad.bench.filter(id => id !== null && id !== undefined)
    ];
    
    // Filter players by compatible positions
    const compatible = allPlayers.filter(p => {
        // Exclude players already in squad or bench
        if (usedPlayerIds.includes(p.id)) return false;
        
        // Position compatibility
        if (requiredPos === 'GK') return p.position === 'GK';
        if (requiredPos.includes('B')) return ['CB', 'LB', 'RB'].includes(p.position);
        if (requiredPos.includes('MF')) return ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(p.position);
        if (requiredPos.includes('WF') || requiredPos === 'CF') return ['LWF', 'RWF', 'CF'].includes(p.position);
        return p.position === requiredPos;
    });
    
    const container = document.getElementById('availablePlayers');
    container.innerHTML = '';
    
    if (compatible.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">No compatible players available</p>';
        return;
    }
    
    compatible.forEach(player => {
        const card = createPlayerCard(player, () => {
            assignPlayerToPosition(player.id, selectedPosition);
        });
        container.appendChild(card);
    });
    
    // Switch to squad tab
    showTab('squad');
}

// Assign player to position
function assignPlayerToPosition(playerId, positionIndex) {
    // CRITICAL: Check if player already exists ANYWHERE in squad or bench
    const inSquad = currentSquad.main.filter(id => id !== null).indexOf(playerId);
    const inBench = currentSquad.bench.filter(id => id !== null).indexOf(playerId);
    
    if (inSquad !== -1 && inSquad !== positionIndex) {
        alert('⚠️ This player is already in your squad at another position!');
        return;
    }
    
    if (inBench !== -1) {
        alert('⚠️ This player is already on your bench!');
        return;
    }
    
    // If position is already occupied, move that player to bench
    const currentPlayerAtPosition = currentSquad.main[positionIndex];
    if (currentPlayerAtPosition && currentPlayerAtPosition !== playerId) {
        // Check bench limit (max 8 players)
        if (currentSquad.bench.length >= 8) {
            alert('⚠️ Bench is full! Maximum 8 players allowed on bench.');
            return;
        }
        currentSquad.bench.push(currentPlayerAtPosition);
    }
    
    // Assign player to position
    currentSquad.main[positionIndex] = playerId;
    
    renderSquadPitch();
    renderAvailablePlayers();
    calculateTeamRating();
}

// Change formation
function changeFormation() {
    const newFormation = document.getElementById('formationSelect').value;
    
    if (confirm(`Change formation to ${newFormation}? Your current squad will be cleared.`)) {
        currentFormation = newFormation;
        currentSquad.main = new Array(11).fill(null);
        renderSquadPitch();
        renderAvailablePlayers();
        calculateTeamRating();
    } else {
        document.getElementById('formationSelect').value = currentFormation;
    }
}

// Save squad
async function saveSquad(silent = false) {
    try {
        const response = await fetch('/api/squad/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                squad: currentSquad,
                formation: currentFormation
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            if (!silent) {
                alert('✅ Squad saved successfully!');
            } else {
                console.log('✅ Squad auto-saved after cleanup');
            }
        } else {
            if (!silent) {
                alert('❌ Failed to save squad: ' + (result.error || 'Unknown error'));
            }
        }
    } catch (error) {
        console.error('Error saving squad:', error);
        if (!silent) {
            alert('❌ Failed to save squad. Please try again.');
        }
    }
}

// Filter players
function filterPlayers() {
    const searchTerm = document.getElementById('playerSearch').value.toLowerCase();
    const positionFilter = document.getElementById('positionFilter').value;
    const ratingSort = document.getElementById('availableRatingSort').value;
    
    availablePlayersList = allPlayers.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm);
        let matchesPosition = true;
        
        if (positionFilter) {
            if (positionFilter === 'DEF') {
                matchesPosition = ['CB', 'LB', 'RB'].includes(player.position);
            } else if (positionFilter === 'MID') {
                matchesPosition = ['DMF', 'CMF', 'AMF', 'LMF', 'RMF'].includes(player.position);
            } else if (positionFilter === 'ATT') {
                matchesPosition = ['LWF', 'RWF', 'CF'].includes(player.position);
            } else {
                matchesPosition = player.position === positionFilter;
            }
        }
        
        return matchesSearch && matchesPosition;
    });
    
    // Sort by rating if selected
    if (ratingSort === 'high-low') {
        availablePlayersList.sort((a, b) => b.overall - a.overall);
    } else if (ratingSort === 'low-high') {
        availablePlayersList.sort((a, b) => a.overall - b.overall);
    }
    
    renderAvailablePlayers();
}

// Filter all players
function filterAllPlayers() {
    const searchTerm = document.getElementById('allPlayersSearch').value.toLowerCase();
    const rarityFilter = document.getElementById('rarityFilter').value;
    const ratingSort = document.getElementById('ratingSort').value;
    
    let filtered = allPlayers.filter(player => {
        const matchesSearch = player.name.toLowerCase().includes(searchTerm);
        const matchesRarity = !rarityFilter || player.rarity === rarityFilter;
        return matchesSearch && matchesRarity;
    });
    
    // Sort by rating if selected
    if (ratingSort === 'high-low') {
        filtered.sort((a, b) => b.overall - a.overall);
    } else if (ratingSort === 'low-high') {
        filtered.sort((a, b) => a.overall - b.overall);
    }
    
    const container = document.getElementById('allPlayersGrid');
    container.innerHTML = '';
    
    if (filtered.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">No players found</p>';
        return;
    }
    
    filtered.forEach(player => {
        const card = createPlayerCard(player, () => showPlayerDetails(player));
        container.appendChild(card);
    });
}

// Show team tab
function showTeamTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.team-tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update tab buttons
    document.querySelectorAll('.team-tab').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
}

// Close modal on outside click
window.onclick = function(event) {
    const modal = document.getElementById('playerModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Drag and Drop Handlers
let draggedElement = null;
let draggedPlayerId = null;
let draggedFromPosition = null;
let draggedFromBench = false;
let draggedBenchIndex = null;

function handleDragStart(e) {
    draggedElement = e.target;
    draggedPlayerId = e.target.dataset.playerId;
    draggedFromPosition = parseInt(e.target.dataset.position);
    draggedFromBench = false;
    draggedBenchIndex = null;
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    
    // Start auto-scroll
    startAutoScroll(e);
}

function handleBenchDragStart(e) {
    draggedElement = e.target;
    draggedPlayerId = e.target.dataset.playerId;
    draggedFromPosition = null;
    draggedFromBench = true;
    draggedBenchIndex = parseInt(e.target.dataset.benchIndex);
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    
    // Start auto-scroll
    startAutoScroll(e);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    
    // Stop auto-scroll
    stopAutoScroll();
    
    // Remove drag-over class from all slots
    document.querySelectorAll('.player-slot').forEach(slot => {
        slot.classList.remove('drag-over');
    });
}

function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    
    e.dataTransfer.dropEffect = 'move';
    e.target.closest('.player-slot')?.classList.add('drag-over');
    
    return false;
}

function handleDragLeave(e) {
    e.target.closest('.player-slot')?.classList.remove('drag-over');
}

function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.preventDefault();
    
    const dropSlot = e.target.closest('.player-slot');
    if (!dropSlot) return;
    
    const dropPosition = parseInt(dropSlot.dataset.position);
    const dropPlayerId = dropSlot.dataset.playerId;
    
    // Don't drop on the same position
    if (!draggedFromBench && draggedFromPosition === dropPosition) {
        dropSlot.classList.remove('drag-over');
        return false;
    }
    
    // If dragging from bench
    if (draggedFromBench) {
        // Remove from bench
        currentSquad.bench.splice(draggedBenchIndex, 1);
        
        // If dropping on occupied slot, move that player to bench
        if (dropPlayerId) {
            // Check bench limit before adding
            if (currentSquad.bench.length >= 8) {
                alert('⚠️ Bench is full! Maximum 8 players allowed.');
                currentSquad.bench.splice(draggedBenchIndex, 0, draggedPlayerId); // Put back
                dropSlot.classList.remove('drag-over');
                return false;
            }
            currentSquad.bench.push(dropPlayerId);
        }
        
        // Add to squad position
        currentSquad.main[dropPosition] = draggedPlayerId;
    }
    // If dragging from available players (not from pitch or bench)
    else if (draggedFromPosition === null && !draggedFromBench) {
        // Check if player already exists in squad (strict check)
        const inSquad = currentSquad.main.filter(id => id !== null).indexOf(draggedPlayerId);
        if (inSquad !== -1) {
            alert('⚠️ This player is already in your squad!');
            dropSlot.classList.remove('drag-over');
            return false;
        }
        
        // Check if player is in bench (strict check)
        const inBench = currentSquad.bench.filter(id => id !== null).indexOf(draggedPlayerId);
        if (inBench !== -1) {
            alert('⚠️ This player is already on your bench!');
            dropSlot.classList.remove('drag-over');
            return false;
        }
        
        // If dropping on occupied slot, move that player to bench
        if (dropPlayerId) {
            // Check bench limit before adding
            if (currentSquad.bench.length >= 8) {
                alert('⚠️ Bench is full! Maximum 8 players allowed.');
                dropSlot.classList.remove('drag-over');
                return false;
            }
            currentSquad.bench.push(dropPlayerId);
        }
        
        // Add to position
        currentSquad.main[dropPosition] = draggedPlayerId;
    } else {
        // Swap players from pitch
        if (dropPlayerId) {
            // Swap the two players
            currentSquad.main[draggedFromPosition] = dropPlayerId;
            currentSquad.main[dropPosition] = draggedPlayerId;
        } else {
            // Move to empty slot
            currentSquad.main[dropPosition] = draggedPlayerId;
            currentSquad.main[draggedFromPosition] = null;
        }
    }
    
    // Re-render the pitch
    renderSquadPitch();
    renderAvailablePlayers();
    calculateTeamRating();
    
    return false;
}

// Handle drop on bench
function handleBenchDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    e.preventDefault();
    
    const dropTarget = e.target.closest('.bench-player');
    
    // If dragging from squad to bench
    if (draggedFromPosition !== null && !draggedFromBench) {
        // Check bench limit
        if (currentSquad.bench.length >= 8) {
            alert('⚠️ Bench is full! Maximum 8 players allowed.');
            return false;
        }
        
        // Remove from squad
        currentSquad.main[draggedFromPosition] = null;
        
        // Add to bench if not already there
        if (!currentSquad.bench.includes(draggedPlayerId)) {
            currentSquad.bench.push(draggedPlayerId);
        }
    }
    // If dragging from available players to bench
    else if (draggedFromPosition === null && !draggedFromBench) {
        // Check bench limit
        if (currentSquad.bench.length >= 8) {
            alert('⚠️ Bench is full! Maximum 8 players allowed.');
            return false;
        }
        
        // Check if already in squad or bench (strict check)
        const inSquad = currentSquad.main.filter(id => id !== null).includes(draggedPlayerId);
        const inBench = currentSquad.bench.filter(id => id !== null).includes(draggedPlayerId);
        
        if (inSquad) {
            alert('⚠️ This player is already in your squad!');
            return false;
        }
        if (inBench) {
            alert('⚠️ This player is already on your bench!');
            return false;
        }
        
        // Add to bench
        currentSquad.bench.push(draggedPlayerId);
    }
    // If swapping bench players
    else if (draggedFromBench && dropTarget) {
        const dropBenchIndex = parseInt(dropTarget.dataset.benchIndex);
        if (draggedBenchIndex !== dropBenchIndex) {
            // Swap bench positions
            const temp = currentSquad.bench[draggedBenchIndex];
            currentSquad.bench[draggedBenchIndex] = currentSquad.bench[dropBenchIndex];
            currentSquad.bench[dropBenchIndex] = temp;
        }
    }
    
    // Re-render
    renderSquadPitch();
    renderAvailablePlayers();
    calculateTeamRating();
    
    return false;
}

// Make player cards draggable too
function createPlayerCard(player, onClick) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.draggable = true;
    card.dataset.playerId = player.id;
    card.dataset.rarity = player.rarity;
    
    // Drag events for player cards
    card.addEventListener('dragstart', (e) => {
        draggedPlayerId = player.id;
        draggedFromPosition = null; // Coming from available players
        e.target.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'copy';
    });
    
    card.addEventListener('dragend', (e) => {
        e.target.classList.remove('dragging');
    });
    
    card.onclick = onClick;
    
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
        <div class="rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
        <div class="name">${player.name}</div>
    `;
    
    return card;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    init();
    
    // Make bench section a drop zone
    const benchSection = document.getElementById('benchSection');
    if (benchSection) {
        benchSection.addEventListener('dragover', (e) => {
            e.preventDefault();
            benchSection.classList.add('drag-over');
        });
        
        benchSection.addEventListener('dragleave', (e) => {
            if (e.target === benchSection) {
                benchSection.classList.remove('drag-over');
            }
        });
        
        benchSection.addEventListener('drop', (e) => {
            e.preventDefault();
            benchSection.classList.remove('drag-over');
            
            // Check bench limit first
            if (currentSquad.bench.length >= 8 && !draggedFromBench) {
                alert('⚠️ Bench is full! Maximum 8 players allowed.');
                return;
            }
            
            // If dragging from squad to bench
            if (draggedFromPosition !== null && !draggedFromBench) {
                currentSquad.main[draggedFromPosition] = null;
                if (!currentSquad.bench.includes(draggedPlayerId)) {
                    currentSquad.bench.push(draggedPlayerId);
                }
            }
            // If dragging from available players to bench
            else if (draggedFromPosition === null && !draggedFromBench) {
                // Strict duplicate check
                const inSquad = currentSquad.main.filter(id => id !== null).includes(draggedPlayerId);
                const inBench = currentSquad.bench.filter(id => id !== null).includes(draggedPlayerId);
                
                if (!inSquad && !inBench) {
                    currentSquad.bench.push(draggedPlayerId);
                } else {
                    alert('⚠️ This player is already in your squad or bench!');
                    return;
                }
            }
            
            renderSquadPitch();
            renderAvailablePlayers();
            calculateTeamRating();
        });
    }
});

// Auto-scroll functionality
function startAutoScroll(e) {
    // Store initial mouse position
    document.addEventListener('dragover', handleAutoScroll);
}

function handleAutoScroll(e) {
    const scrollZone = 100; // pixels from edge to trigger scroll
    const scrollSpeed = 10; // pixels per frame
    
    const viewportHeight = window.innerHeight;
    const mouseY = e.clientY;
    
    // Scroll up if near top
    if (mouseY < scrollZone) {
        window.scrollBy(0, -scrollSpeed);
    }
    // Scroll down if near bottom
    else if (mouseY > viewportHeight - scrollZone) {
        window.scrollBy(0, scrollSpeed);
    }
}

function stopAutoScroll() {
    document.removeEventListener('dragover', handleAutoScroll);
}
