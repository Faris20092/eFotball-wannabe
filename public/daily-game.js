// Daily Game Path System
let userData = null;
let currentPosition = 0;
let totalSteps = 35; // Match penalty START_STEPS

// Initialize page
async function init() {
    await loadUserData();
    generatePath();
    updateDisplay();
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        if (response.ok) {
            const data = await response.json();
            userData = data.gameData || {};
            
            // Update top bar
            document.getElementById('topGP').textContent = (userData.gp || 0).toLocaleString();
            document.getElementById('topEcoins').textContent = (userData.eCoins || 0).toLocaleString();
            document.getElementById('username').textContent = data.discord?.username || 'Player';
            
            if (data.discord?.avatar) {
                const avatarUrl = `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}.png`;
                document.getElementById('userAvatar').src = avatarUrl;
            }
            
            // Get current position from penalty data
            // Position = totalSteps - remaining (e.g., 35 - 23 = 12 steps completed)
            const remaining = userData.minigames?.penalty?.remaining || 35;
            currentPosition = totalSteps - remaining;
            
            // Check mail notifications
            checkMailNotifications();
        } else {
            console.error('Failed to load user data:', response.status);
            document.getElementById('username').textContent = 'Not Logged In';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        document.getElementById('username').textContent = 'Error Loading';
    }
}

// Check mail notifications
async function checkMailNotifications() {
    try {
        const response = await fetch('/api/mail');
        if (response.ok) {
            const mails = await response.json();
            const unreadCount = mails.filter(m => !m.claimed).length;
            
            if (unreadCount > 0) {
                const badge = document.getElementById('mailBadge');
                badge.textContent = unreadCount;
                badge.style.display = 'flex';
            }
        }
    } catch (error) {
        console.error('Error checking mail:', error);
    }
}

// Generate path with nodes
function generatePath() {
    const pathNodes = document.getElementById('pathNodes');
    const pathSvg = document.getElementById('pathSvg');
    
    // Clear existing
    pathNodes.innerHTML = '';
    pathSvg.innerHTML = '';
    
    // Define path coordinates (snake pattern)
    const nodes = [];
    const rows = 5;
    const cols = 10;
    const nodeSpacing = 70;
    const startX = 50;
    const startY = 50;
    
    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            const index = row * cols + col;
            if (index >= totalSteps) break;
            
            // Alternate direction for snake pattern
            const actualCol = row % 2 === 0 ? col : (cols - 1 - col);
            const x = startX + actualCol * nodeSpacing;
            const y = startY + row * nodeSpacing;
            
            nodes.push({ x, y, index });
        }
    }
    
    // Draw connecting lines
    for (let i = 0; i < nodes.length - 1; i++) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', nodes[i].x);
        line.setAttribute('y1', nodes[i].y);
        line.setAttribute('x2', nodes[i + 1].x);
        line.setAttribute('y2', nodes[i + 1].y);
        line.setAttribute('stroke', '#00d4ff');
        line.setAttribute('stroke-width', '3');
        line.setAttribute('opacity', '0.5');
        pathSvg.appendChild(line);
    }
    
    // Create nodes
    nodes.forEach(node => {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'path-node';
        nodeDiv.style.left = `${node.x}px`;
        nodeDiv.style.top = `${node.y}px`;
        
        // Determine node type and reward
        const reward = getRewardForStep(node.index);
        
        // Add icon
        const icon = document.createElement('div');
        icon.className = 'node-icon';
        icon.textContent = reward.icon;
        nodeDiv.appendChild(icon);
        
        // Add step number
        const stepNum = document.createElement('div');
        stepNum.className = 'node-number';
        stepNum.textContent = node.index + 1;
        nodeDiv.appendChild(stepNum);
        
        // Mark current position
        if (node.index === currentPosition) {
            nodeDiv.classList.add('current-position');
            
            // Add player marker
            const marker = document.createElement('div');
            marker.className = 'player-marker';
            marker.textContent = '⚽';
            nodeDiv.appendChild(marker);
        }
        
        // Mark completed nodes
        if (node.index < currentPosition) {
            nodeDiv.classList.add('completed');
        }
        
        // Mark special rewards
        if (reward.special) {
            nodeDiv.classList.add('special-reward');
        }
        
        pathNodes.appendChild(nodeDiv);
    });
}

// Get reward for specific step
function getRewardForStep(step) {
    // Special reward at the end (step 34 = reaching 0 remaining)
    if (step === 34) return { icon: '🎁', special: true, name: 'Mystery Reward', type: 'special' };
    
    // Milestone rewards every 10 steps
    if (step % 10 === 9) return { icon: '💎', special: true, name: 'Bonus Reward', type: 'pack' };
    
    // Regular rewards
    const rewards = [
        { icon: '🪙', name: 'eCoins', type: 'ecoins' },
        { icon: '💰', name: 'GP', type: 'gp' },
        { icon: '⚽', name: 'Progress', type: 'progress' },
    ];
    
    return rewards[step % rewards.length];
}

// Update display
function updateDisplay() {
    const remaining = totalSteps - currentPosition;
    document.getElementById('remainingSteps').textContent = remaining;
    
    // Find next milestone reward (every 10 steps: 9, 19, 29, and final at 34)
    const milestones = [9, 19, 29, 34];
    const nextMilestone = milestones.find(m => m >= currentPosition);
    
    if (nextMilestone !== undefined) {
        const stepsToReward = nextMilestone - currentPosition;
        const rewardName = nextMilestone === 34 ? 'Mystery Reward' : 'Bonus Reward';
        const rewardIcon = nextMilestone === 34 ? '🎁' : '💎';
        
        document.getElementById('nextReward').innerHTML = `
            <div class="reward-icon">${rewardIcon}</div>
            <div class="reward-details">
                <div class="reward-name">${rewardName}</div>
                <div class="reward-steps">In ${stepsToReward} step${stepsToReward !== 1 ? 's' : ''}</div>
            </div>
        `;
    } else {
        document.getElementById('nextReward').innerHTML = `
            <div class="reward-icon">🎉</div>
            <div class="reward-details">
                <div class="reward-name">Path Complete!</div>
                <div class="reward-steps">Keep playing for more rewards</div>
            </div>
        `;
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
