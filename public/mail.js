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
    
    if (mailData.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    // Sort by date (newest first)
    const sortedMail = [...mailData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedMail.forEach(mail => {
        const mailItem = document.createElement('div');
        mailItem.className = `mail-item ${mail.claimed ? 'claimed' : ''}`;
        mailItem.onclick = () => !mail.claimed && claimMail(mail.id);
        
        const date = new Date(mail.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
        
        // Format rewards
        let rewardsHTML = '';
        if (mail.rewards) {
            if (mail.rewards.gp) {
                rewardsHTML += `<span class="reward-item">💰 ${mail.rewards.gp.toLocaleString()} GP</span>`;
            }
            if (mail.rewards.eCoins) {
                rewardsHTML += `<span class="reward-item">🪙 ${mail.rewards.eCoins} eCoins</span>`;
            }
            if (mail.rewards.players && mail.rewards.players.length > 0) {
                rewardsHTML += `<span class="reward-item">👤 ${mail.rewards.players.length} Player(s)</span>`;
            }
            if (mail.rewards.packs && mail.rewards.packs.length > 0) {
                rewardsHTML += `<span class="reward-item">📦 ${mail.rewards.packs.length} Pack(s)</span>`;
            }
        }
        
        mailItem.innerHTML = `
            <div class="mail-icon">${mail.claimed ? '✅' : '📬'}</div>
            <div class="mail-content">
                <div class="mail-title">${mail.title || 'Reward'}</div>
                <div class="mail-message">${mail.message || 'You have received rewards!'}</div>
                <div class="mail-rewards">${rewardsHTML || '<span class="reward-item">🎁 Reward</span>'}</div>
                <div class="mail-date">${formattedDate}</div>
            </div>
            <div class="mail-action">
                ${mail.claimed ? '<span class="claimed-badge">Claimed</span>' : '<button class="claim-btn">Claim</button>'}
            </div>
        `;
        
        container.appendChild(mailItem);
    });
}

// Update stats
function updateStats() {
    const total = mailData.length;
    const unclaimed = mailData.filter(m => !m.claimed).length;
    
    document.getElementById('totalMail').textContent = total;
    document.getElementById('unclaimedMail').textContent = unclaimed;
    
    // Update badge
    const badge = document.getElementById('mailBadge');
    if (unclaimed > 0) {
        badge.textContent = unclaimed;
        badge.style.display = 'block';
    } else {
        badge.style.display = 'none';
    }
    
    // Enable/disable claim all button
    const claimAllBtn = document.getElementById('claimAllBtn');
    claimAllBtn.disabled = unclaimed === 0;
}

// Claim single mail
async function claimMail(mailId) {
    try {
        const response = await fetch('/api/mail/claim', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ mailId })
        });
        
        const data = await response.json();
        
        if (data.success) {
            // Update local data
            const mail = mailData.find(m => m.id === mailId);
            if (mail) {
                mail.claimed = true;
            }
            
            // Show success message
            showNotification('✅ Reward claimed successfully!', 'success');
            
            // Re-render
            renderMail();
            updateStats();
            
            // Update currency display
            if (data.newBalance) {
                document.getElementById('topGP').textContent = (data.newBalance.gp || 0).toLocaleString();
                document.getElementById('topEcoins').textContent = data.newBalance.eCoins || 0;
            }
        } else {
            showNotification('❌ ' + (data.message || 'Failed to claim reward'), 'error');
        }
    } catch (error) {
        console.error('Error claiming mail:', error);
        showNotification('❌ Error claiming reward', 'error');
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
        
        if (data.success) {
            // Update local data
            mailData.forEach(mail => {
                mail.claimed = true;
            });
            
            // Show success message
            showNotification(`✅ Claimed ${data.claimedCount} reward(s) successfully!`, 'success');
            
            // Re-render
            renderMail();
            updateStats();
            
            // Update currency display
            if (data.newBalance) {
                document.getElementById('topGP').textContent = (data.newBalance.gp || 0).toLocaleString();
                document.getElementById('topEcoins').textContent = data.newBalance.eCoins || 0;
            }
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

// Helper function for news
function viewNews() {
    alert('📰 News feature - Use /news command in Discord to view latest updates!');
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
