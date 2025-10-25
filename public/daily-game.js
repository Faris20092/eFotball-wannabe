// Daily Game Path System
let userData = null;
let currentPosition = 35; // Start at 35
let totalSteps = 36; // 0 to 35 = 36 positions

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
            // Position = remaining (35 down to 0)
            currentPosition = userData.minigames?.penalty?.remaining ?? 35;
            
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
    
    // Define path coordinates (snake pattern from 35 to 0)
    const nodes = [];
    const rows = 4;
    const cols = 10;
    const nodeSpacing = 70;
    const startX = 50;
    const startY = 50;
    
    // Generate positions for steps 35 down to 0
    for (let i = 35; i >= 0; i--) {
        const pathIndex = 35 - i; // 0 to 35
        const row = Math.floor(pathIndex / cols);
        const colInRow = pathIndex % cols;
        
        // Alternate direction for snake pattern
        const actualCol = row % 2 === 0 ? colInRow : (cols - 1 - colInRow);
        const x = startX + actualCol * nodeSpacing;
        const y = startY + row * nodeSpacing;
        
        nodes.push({ x, y, step: i }); // step is the actual remaining value (35 to 0)
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
        const reward = getRewardForStep(node.step);
        
        // Add icon
        const icon = document.createElement('div');
        icon.className = 'node-icon';
        icon.textContent = reward.icon;
        nodeDiv.appendChild(icon);
        
        // Add step number
        const stepNum = document.createElement('div');
        stepNum.className = 'node-number';
        stepNum.textContent = node.step;
        nodeDiv.appendChild(stepNum);
        
        // Mark current position
        if (node.step === currentPosition) {
            nodeDiv.classList.add('current-position');
            
            // Add player marker
            const marker = document.createElement('div');
            marker.className = 'player-marker';
            marker.textContent = '⚽';
            nodeDiv.appendChild(marker);
        }
        
        // Mark completed nodes (passed = higher than current)
        if (node.step > currentPosition) {
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
    // End reward at step 0 - Random reward
    if (step === 0) {
        return { icon: '🎁', special: true, name: 'Mystery Reward', type: 'special' };
    }
    
    // Milestone: 50 eCoins at step 19
    if (step === 19) {
        return { icon: '🪙', special: true, name: '50 eCoins', type: 'ecoins' };
    }
    
    // Milestone: +500 GP for ranges 35-20 and 18-1
    if ((step >= 20 && step <= 35) || (step >= 1 && step <= 18)) {
        return { icon: '💰', name: '+500 GP', type: 'gp' };
    }
    
    // Default
    return { icon: '⚽', name: 'Progress', type: 'progress' };
}

// Update display
function updateDisplay() {
    // Remaining is the current position (35 down to 0)
    document.getElementById('remainingSteps').textContent = currentPosition;
    
    // Find next big milestone (19 = eCoins, 0 = Mystery Reward)
    let nextRewardStep = null;
    let rewardName = '';
    let rewardIcon = '';
    
    if (currentPosition > 19) {
        nextRewardStep = 19;
        rewardName = '50 eCoins';
        rewardIcon = '🪙';
    } else if (currentPosition > 0) {
        nextRewardStep = 0;
        rewardName = 'Mystery Reward';
        rewardIcon = '🎁';
    }
    
    if (nextRewardStep !== null) {
        const stepsToReward = currentPosition - nextRewardStep;
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
                <div class="reward-steps">Resets to 35 after claiming</div>
            </div>
        `;
    }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', init);
