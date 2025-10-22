// Global state
let userData = null;
let allPlayers = [];
let currentSquad = { main: [], bench: [] };
let currentFormation = '4-3-3';
let availablePlayersList = [];

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
    await loadSquad();
    renderSquadPitch();
    renderAvailablePlayers();
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
        
        calculateTeamRating();
    } catch (error) {
        console.error('Error loading squad:', error);
    }
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
            
            rows[line].forEach((position, idx) => {
                const posIndex = positions.indexOf(position);
                const playerId = currentSquad.main[posIndex];
                const player = playerId ? allPlayers.find(p => p.id === playerId) : null;
                
                const slot = document.createElement('div');
                slot.className = player ? 'player-slot filled' : 'player-slot';
                slot.dataset.position = posIndex;
                
                // Add drag and drop events
                slot.draggable = player ? true : false;
                if (player) {
                    slot.dataset.playerId = player.id;
                    slot.addEventListener('dragstart', handleDragStart);
                    slot.addEventListener('dragend', handleDragEnd);
                }
                slot.addEventListener('dragover', handleDragOver);
                slot.addEventListener('drop', handleDrop);
                slot.addEventListener('dragleave', handleDragLeave);
                
                // Keep click functionality
                slot.onclick = () => openPlayerSelector(posIndex);
                
                slot.innerHTML = `
                    <div class="position-label">${position}</div>
                    ${player ? `
                        <div class="player-name">${player.name}</div>
                        <div class="player-rating">${player.overall}</div>
                    ` : '<div style="color: #999;">Click to add</div>'}
                `;
                
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
            benchPlayer.onclick = () => showPlayerDetails(player);
            benchPlayer.innerHTML = `
                <div>${player.name}</div>
                <div style="font-weight: bold; color: var(--primary);">${player.overall}</div>
                <div style="font-size: 0.85em; color: #666;">${player.position}</div>
            `;
            benchContainer.appendChild(benchPlayer);
        }
    });
}

// Render available players
function renderAvailablePlayers() {
    const container = document.getElementById('availablePlayers');
    container.innerHTML = '';
    
    // Filter out players already in squad
    const usedPlayerIds = [...currentSquad.main, ...currentSquad.bench].filter(id => id !== null);
    const available = availablePlayersList.filter(p => !usedPlayerIds.includes(p.id));
    
    if (available.length === 0) {
        container.innerHTML = '<p style="color: #999; padding: 20px;">No available players</p>';
        return;
    }
    
    available.forEach(player => {
        const card = createPlayerCard(player, () => {
            // Add to squad logic handled in openPlayerSelector
            showPlayerDetails(player);
        });
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
    
    content.innerHTML = `
        <h2>${RARITY_EMOJIS[player.rarity] || '⚽'} ${player.name}</h2>
        <div style="margin: 20px 0;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                <div><strong>Overall:</strong> ${player.overall}</div>
                <div><strong>Position:</strong> ${player.position}</div>
                <div><strong>Rarity:</strong> ${player.rarity}</div>
                <div><strong>Style:</strong> ${player.playingStyle || 'N/A'}</div>
            </div>
            
            <h3 style="color: var(--primary); margin: 20px 0 10px 0;">Stats</h3>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div>⚔️ Attacking: ${stats.attacking || 0}</div>
                <div>🎯 Dribbling: ${stats.dribbling || 0}</div>
                <div>🎯 Passing: ${stats.passing || 0}</div>
                <div>🛡️ Defending: ${stats.defending || 0}</div>
                <div>💪 Physicality: ${stats.physicality || 0}</div>
                <div>🧤 Goalkeeping: ${stats.goalkeeping || 0}</div>
            </div>
            
            ${player.skills && player.skills.length > 0 ? `
                <h3 style="color: var(--primary); margin: 20px 0 10px 0;">Skills</h3>
                <div style="color: #666;">${player.skills.slice(0, 5).join(', ')}</div>
            ` : ''}
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
    const usedPlayerIds = [...currentSquad.main, ...currentSquad.bench].filter(id => id !== null);
    
    // Filter players by compatible positions
    const compatible = allPlayers.filter(p => {
        if (usedPlayerIds.includes(p.id)) return false;
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
async function saveSquad() {
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
            alert('✅ Squad saved successfully!');
        } else {
            alert('❌ Failed to save squad: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error saving squad:', error);
        alert('❌ Failed to save squad. Please try again.');
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

// Show tab
function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
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

function handleDragStart(e) {
    draggedElement = e.target;
    draggedPlayerId = e.target.dataset.playerId;
    draggedFromPosition = parseInt(e.target.dataset.position);
    
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    
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
    if (draggedFromPosition === dropPosition) {
        dropSlot.classList.remove('drag-over');
        return false;
    }
    
    // Swap players
    if (dropPlayerId) {
        // Swap the two players
        currentSquad.main[draggedFromPosition] = dropPlayerId;
        currentSquad.main[dropPosition] = draggedPlayerId;
    } else {
        // Move to empty slot
        currentSquad.main[dropPosition] = draggedPlayerId;
        currentSquad.main[draggedFromPosition] = null;
    }
    
    // Re-render the pitch
    renderSquadPitch();
    calculateTeamRating();
    
    return false;
}

// Make player cards draggable too
function createPlayerCard(player, onClick) {
    const card = document.createElement('div');
    card.className = 'player-card';
    card.draggable = true;
    card.dataset.playerId = player.id;
    
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
    
    card.innerHTML = `
        <div class="rarity">${RARITY_EMOJIS[player.rarity] || '⚽'}</div>
        <div class="name">${player.name}</div>
        <div class="overall">${player.overall}</div>
        <div class="position">${player.position}</div>
    `;
    
    return card;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
