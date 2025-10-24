// Global state
let userData = null;
let mailData = [];

const REWARD_EMOJIS = {
    'gp': '💰',
    'eCoins': '🪙',
    'player': '👤',
    'pack': '📦',
    'trainer': '📚'
};

// Initialize
async function init() {
    await loadUserData();
    await loadMail();
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
        
        if (data.gameData) {
            document.getElementById('topGP').textContent = (data.gameData.gp || 0).toLocaleString();
            document.getElementById('topEcoins').textContent = data.gameData.eCoins || 0;
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load mail
async function loadMail() {
    try {
        const response = await fetch('/api/mail');
        const data = await response.json();
        mailData = data.mail || [];
        
        console.log('Loaded mail data:', mailData);
        console.log('Mail count:', mailData.length);
        
        renderMail();
        updateStats();
    } catch (error) {
        console.error('Error loading mail:', error);
        document.getElementById('emptyState').style.display = 'block';
    }
}

// Render mail
function renderMail() {
    const container = document.getElementById('mailList');
    container.innerHTML = '';
    
    console.log('Rendering mail. Total items:', mailData.length);
    
    // Sort by date (newest first) and filter out claimed mail
    const sortedMail = [...mailData]
        .filter(m => !m.claimed)
        .sort((a, b) => new Date(b.date) - new Date(a.date));
    
    console.log('Unclaimed mail:', sortedMail.length);
    console.log('Mail items:', sortedMail);
    
    if (sortedMail.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    sortedMail.forEach((mail, index) => {
        // Generate ID if it doesn't exist
        if (!mail.id) {
            mail.id = `mail_${Date.now()}_${index}`;
        }
        
        const mailItem = document.createElement('div');
        mailItem.className = 'inbox-item';
        mailItem.dataset.mailId = mail.id;
        
        const date = new Date(mail.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: '2-digit',
            day: '2-digit',
            year: 'numeric'
        });
        
        // Get reward icon and description
        let rewardIcon = '🎁';
        let rewardDescription = '';
        let expiryText = '';
        
        // Handle new format (rewards object)
        if (mail.rewards) {
            const rewardParts = [];
            
            if (mail.rewards.gp) {
                rewardIcon = '💰';
                rewardParts.push(`${mail.rewards.gp.toLocaleString()} GP`);
            }
            if (mail.rewards.eCoins) {
                rewardIcon = '🪙';
                rewardParts.push(`${mail.rewards.eCoins} eFootball™ Coins`);
            }
            if (mail.rewards.players && mail.rewards.players.length > 0) {
                mail.rewards.players.forEach(player => {
                    rewardIcon = '👤';
                    rewardParts.push(`${player.name} x1`);
                });
            }
            if (mail.rewards.packs && mail.rewards.packs.length > 0) {
                mail.rewards.packs.forEach(pack => {
                    rewardIcon = '⭐';
                    rewardParts.push(`${pack} Pack x1`);
                });
            }
            
            rewardDescription = rewardParts.join(', ');
        }
        // Handle old format (type, amount, rarity fields)
        else if (mail.type) {
            if (mail.type === 'gp') {
                rewardIcon = '💰';
                rewardDescription = `${(mail.amount || 0).toLocaleString()} GP`;
            } else if (mail.type === 'eCoins') {
                rewardIcon = '🪙';
                rewardDescription = `${mail.amount || 0} eFootball™ Coins`;
            } else if (mail.type === 'pack') {
                rewardIcon = '⭐';
                rewardDescription = `${mail.rarity || 'Free'} Pack x1`;
            } else if (mail.type === 'trainer') {
                rewardIcon = '📚';
                rewardDescription = `${mail.trainerName || 'Trainer'} x1`;
            }
        }
        
        // Check if mail has expiry
        if (mail.expiry) {
            const expiryDate = new Date(mail.expiry);
            const now = new Date();
            const diffTime = expiryDate - now;
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.ceil((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            
            if (diffTime > 0) {
                expiryText = `<div class="inbox-expiry">Expires in: ${diffDays} day(s) ${diffHours} hr(s)</div>`;
            }
        }
        
        mailItem.innerHTML = `
            <div class="inbox-icon" style="background: ${getRewardColor(mail)}">
                <span>${rewardIcon}</span>
            </div>
            <div class="inbox-content">
                <div class="inbox-title">${mail.title || (mail.type ? (mail.type === 'pack' ? 'Free Pack' : mail.type === 'eCoins' ? 'eCoins Reward' : mail.type === 'gp' ? 'GP Reward' : 'Reward') : 'Reward')}</div>
                <div class="inbox-description">${rewardDescription || 'You have received rewards!'}</div>
            </div>
            <div class="inbox-meta">
                <div class="inbox-date">${formattedDate}</div>
                ${expiryText}
            </div>
        `;
        
        container.appendChild(mailItem);
    });
}

// Get reward background color based on type
function getRewardColor(mail) {
    // Handle new format (rewards object)
    if (mail.rewards) {
        const rewards = mail.rewards;
        if (rewards.players && rewards.players.length > 0) {
            return 'linear-gradient(135deg, #4CAF50, #45a049)'; // Green for players
        }
        if (rewards.eCoins) {
            return 'linear-gradient(135deg, #FFD700, #FFA500)'; // Gold for coins
        }
        if (rewards.packs && rewards.packs.length > 0) {
            return 'linear-gradient(135deg, #FFEB3B, #FBC02D)'; // Yellow for packs
        }
        if (rewards.gp) {
            return 'linear-gradient(135deg, #2196F3, #1976D2)'; // Blue for GP
        }
    }
    // Handle old format (type field)
    else if (mail.type) {
        if (mail.type === 'pack') {
            return 'linear-gradient(135deg, #FFEB3B, #FBC02D)'; // Yellow for packs
        }
        if (mail.type === 'eCoins') {
            return 'linear-gradient(135deg, #FFD700, #FFA500)'; // Gold for coins
        }
        if (mail.type === 'gp') {
            return 'linear-gradient(135deg, #2196F3, #1976D2)'; // Blue for GP
        }
        if (mail.type === 'trainer') {
            return 'linear-gradient(135deg, #9C27B0, #7B1FA2)'; // Purple for trainers
        }
    }
    
    return 'linear-gradient(135deg, #4CAF50, #45a049)'; // Green default
}

// Update stats
function updateStats() {
    const unclaimed = mailData.filter(m => !m.claimed).length;
    
    // Update badge
    const badge = document.getElementById('mailBadge');
    if (badge) {
        if (unclaimed > 0) {
            badge.textContent = unclaimed;
            badge.style.display = 'block';
        } else {
            badge.style.display = 'none';
        }
    }
    
    // Enable/disable claim all button
    const claimAllBtn = document.getElementById('claimAllBtn');
    if (claimAllBtn) {
        claimAllBtn.disabled = unclaimed === 0;
    }
}

// Claim single mail
async function claimMail(mailId) {
    if (!mailId) {
        console.error('No mail ID provided');
        showNotification('❌ Invalid mail ID', 'error');
        return;
    }
    
    try {
        console.log('Claiming mail:', mailId);
        
        const response = await fetch('/api/mail/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mailId: mailId })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Claim response:', data);
        
        if (data.success) {
            // Update local data
            const mail = mailData.find(m => m.id == mailId || m.id === mailId);
            if (mail) {
                mail.claimed = true;
            }
            
            // Show detailed success message
            let message = '✅ Claimed successfully!';
            showNotification(message, 'success');
            
            // Re-render
            renderMail();
            updateStats();
            
            // Reload user data to update currency
            await loadUserData();
        } else {
            console.error('Claim failed:', data.message);
            showNotification('❌ ' + (data.message || 'Failed to claim reward'), 'error');
        }
    } catch (error) {
        console.error('Error claiming mail:', error);
        showNotification('❌ Error: ' + error.message, 'error');
    }
}

// Claim all mail
async function claimAll() {
    try {
        const response = await fetch('/api/mail/claim-all', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Claim all response:', data);
        
        if (data.success) {
            // Update local data
            mailData.forEach(mail => {
                if (!mail.claimed) {
                    mail.claimed = true;
                }
            });
            
            // Show success message
            const count = data.claimedCount || 0;
            let message = `✅ Claimed ${count} reward(s) successfully!`;
            showNotification(message, 'success');
            
            // Reload all data
            await loadMail();
            await loadUserData();
        } else {
            showNotification('❌ ' + (data.message || 'Failed to claim rewards'), 'error');
        }
    } catch (error) {
        console.error('Error claiming all mail:', error);
        showNotification('❌ Error claiming rewards', 'error');
    }
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
        color: white;
        padding: 15px 25px;
        border-radius: 10px;
        font-weight: bold;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
