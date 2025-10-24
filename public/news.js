// Global state
let userData = null;
let newsData = [];

// Initialize
async function init() {
    await loadUserData();
    await loadNews();
}

// Load user data
async function loadUserData() {
    try {
        const response = await fetch('/api/user');
        const data = await response.json();
        userData = data.gameData;
        
        // Update UI
        document.getElementById('username').textContent = data.discord.username;
        document.getElementById('userAvatar').src = data.discord.avatar 
            ? `https://cdn.discordapp.com/avatars/${data.discord.id}/${data.discord.avatar}.png`
            : 'https://cdn.discordapp.com/embed/avatars/0.png';
        
        document.getElementById('topGP').textContent = (userData?.gp || 0).toLocaleString();
        document.getElementById('topEcoins').textContent = userData?.eCoins || 0;
        
        // Update mail badge
        const unclaimedMail = (userData?.mail || []).filter(m => !m.claimed).length;
        const badge = document.getElementById('mailBadge');
        if (unclaimedMail > 0) {
            badge.textContent = unclaimedMail;
            badge.style.display = 'block';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load news
async function loadNews() {
    try {
        const response = await fetch('/api/news');
        const data = await response.json();
        newsData = data.news || [];
        
        console.log('Loaded news:', newsData);
        
        renderNews();
    } catch (error) {
        console.error('Error loading news:', error);
        document.getElementById('emptyState').style.display = 'block';
    } finally {
        document.getElementById('loading').style.display = 'none';
    }
}

// Render news
function renderNews() {
    const container = document.getElementById('newsList');
    container.innerHTML = '';
    
    if (newsData.length === 0) {
        document.getElementById('emptyState').style.display = 'block';
        return;
    }
    
    document.getElementById('emptyState').style.display = 'none';
    
    // Sort by date (newest first)
    const sortedNews = [...newsData].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    sortedNews.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.className = 'news-item';
        newsItem.onclick = () => openNewsModal(news);
        
        const date = new Date(news.date);
        const formattedDate = date.toLocaleDateString('en-US', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
        
        // Get category icon and color
        const categoryInfo = getCategoryInfo(news.category);
        
        newsItem.innerHTML = `
            <div class="news-icon" style="background: ${categoryInfo.color}">
                <span>${categoryInfo.icon}</span>
                <div class="news-category">${news.category || 'Update'}</div>
            </div>
            <div class="news-content">
                <div class="news-item-title">${news.title}</div>
                <div class="news-preview">${news.preview || news.content.substring(0, 60) + '...'}</div>
            </div>
            <div class="news-date">${formattedDate}</div>
        `;
        
        container.appendChild(newsItem);
    });
}

// Get category info
function getCategoryInfo(category) {
    const categories = {
        'Update': { icon: '⬆️', color: 'linear-gradient(135deg, #4CAF50, #45a049)' },
        'Issue': { icon: '✕', color: 'linear-gradient(135deg, #E91E63, #C2185B)' },
        'Event': { icon: '🎉', color: 'linear-gradient(135deg, #FF9800, #F57C00)' },
        'Maintenance': { icon: '🔧', color: 'linear-gradient(135deg, #9C27B0, #7B1FA2)' },
        'Announcement': { icon: '📢', color: 'linear-gradient(135deg, #2196F3, #1976D2)' }
    };
    
    return categories[category] || categories['Update'];
}

// Open news modal
function openNewsModal(news) {
    const modal = document.getElementById('newsModal');
    const categoryInfo = getCategoryInfo(news.category);
    
    document.getElementById('newsModalIcon').innerHTML = `
        <div style="background: ${categoryInfo.color}; width: 100%; height: 150px; display: flex; align-items: center; justify-content: center; border-radius: 15px 15px 0 0;">
            <span style="font-size: 4em;">${categoryInfo.icon}</span>
        </div>
    `;
    document.getElementById('newsModalTitle').textContent = news.title;
    document.getElementById('newsModalBody').innerHTML = `
        <p style="color: rgba(255,255,255,0.7); margin-bottom: 20px;">
            ${new Date(news.date).toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })}
        </p>
        <div style="line-height: 1.8; white-space: pre-wrap;">${news.content}</div>
    `;
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('active'), 10);
}

// Close news modal
function closeNewsModal() {
    const modal = document.getElementById('newsModal');
    modal.classList.remove('active');
    setTimeout(() => modal.style.display = 'none', 300);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', init);
