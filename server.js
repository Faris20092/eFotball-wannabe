require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;

// Bot process
let botProcess = null;
let botStatus = {
    isRunning: false,
    startTime: null,
    restarts: 0,
    lastError: null
};

// Start the Discord bot
function startBot() {
    console.log('🚀 Starting Discord bot...');
    
    botProcess = spawn('node', ['index.js'], {
        cwd: __dirname,
        stdio: 'inherit'
    });

    botStatus.isRunning = true;
    botStatus.startTime = new Date();

    botProcess.on('error', (error) => {
        console.error('❌ Bot process error:', error);
        botStatus.lastError = error.message;
        botStatus.isRunning = false;
    });

    botProcess.on('exit', (code, signal) => {
        console.log(`⚠️ Bot process exited with code ${code} and signal ${signal}`);
        botStatus.isRunning = false;
        
        // Auto-restart if crashed
        if (code !== 0) {
            botStatus.restarts++;
            console.log(`🔄 Restarting bot... (Restart #${botStatus.restarts})`);
            setTimeout(startBot, 5000); // Restart after 5 seconds
        }
    });
}

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use(express.json());

// Routes
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>eFotball Discord Bot - Status</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            max-width: 600px;
            width: 100%;
            padding: 40px;
            animation: fadeIn 0.5s ease-in;
        }
        
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .header h1 {
            color: #667eea;
            font-size: 2.5em;
            margin-bottom: 10px;
        }
        
        .header p {
            color: #666;
            font-size: 1.1em;
        }
        
        .status-card {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 15px;
            margin-bottom: 20px;
            text-align: center;
        }
        
        .status-indicator {
            font-size: 3em;
            margin-bottom: 10px;
        }
        
        .status-text {
            font-size: 1.5em;
            font-weight: bold;
            margin-bottom: 5px;
        }
        
        .status-detail {
            opacity: 0.9;
            font-size: 0.9em;
        }
        
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin-bottom: 20px;
        }
        
        .info-item {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            text-align: center;
        }
        
        .info-label {
            color: #666;
            font-size: 0.9em;
            margin-bottom: 5px;
        }
        
        .info-value {
            color: #333;
            font-size: 1.3em;
            font-weight: bold;
        }
        
        .features {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
        }
        
        .features h3 {
            color: #667eea;
            margin-bottom: 15px;
        }
        
        .features ul {
            list-style: none;
        }
        
        .features li {
            padding: 8px 0;
            color: #555;
        }
        
        .features li:before {
            content: "⚽ ";
            color: #667eea;
            font-weight: bold;
        }
        
        .invite-button {
            display: block;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            text-align: center;
            padding: 15px 30px;
            border-radius: 10px;
            text-decoration: none;
            font-weight: bold;
            font-size: 1.1em;
            transition: transform 0.2s, box-shadow 0.2s;
        }
        
        .invite-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }
        
        .footer {
            text-align: center;
            margin-top: 20px;
            color: #999;
            font-size: 0.9em;
        }
        
        .pulse {
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚽ eFotball Bot</h1>
            <p>Discord Football Manager Bot</p>
        </div>
        
        <div class="status-card">
            <div class="status-indicator pulse">🟢</div>
            <div class="status-text">Bot is Online!</div>
            <div class="status-detail">Running 24/7</div>
        </div>
        
        <div class="info-grid">
            <div class="info-item">
                <div class="info-label">Uptime</div>
                <div class="info-value" id="uptime">Loading...</div>
            </div>
            <div class="info-item">
                <div class="info-label">Restarts</div>
                <div class="info-value" id="restarts">0</div>
            </div>
            <div class="info-item">
                <div class="info-label">Status</div>
                <div class="info-value" id="status">Active</div>
            </div>
        </div>
        
        <div class="features">
            <h3>🎮 Features</h3>
            <ul>
                <li>Contract System - Pull legendary players</li>
                <li>Squad Management - Build your dream team</li>
                <li>Match Simulation - Battle AI teams</li>
                <li>PvP Battles - Challenge real players</li>
                <li>Training System - Level up your players</li>
                <li>Daily Rewards - Login bonuses</li>
                <li>Leaderboards - Compete globally</li>
            </ul>
        </div>
        
        <a href="#" class="invite-button" onclick="alert('Add your Discord bot invite link here!'); return false;">
            🎯 Invite Bot to Your Server
        </a>
        
        <div class="footer">
            <p>eFotball Discord Bot © 2025</p>
            <p>Keeping your bot online 24/7</p>
        </div>
    </div>
    
    <script>
        // Update status every 5 seconds
        setInterval(async () => {
            try {
                const response = await fetch('/api/status');
                const data = await response.json();
                
                document.getElementById('uptime').textContent = data.uptime;
                document.getElementById('restarts').textContent = data.restarts;
                document.getElementById('status').textContent = data.isRunning ? 'Active' : 'Offline';
            } catch (error) {
                console.error('Failed to fetch status:', error);
            }
        }, 5000);
        
        // Initial load
        fetch('/api/status')
            .then(res => res.json())
            .then(data => {
                document.getElementById('uptime').textContent = data.uptime;
                document.getElementById('restarts').textContent = data.restarts;
                document.getElementById('status').textContent = data.isRunning ? 'Active' : 'Offline';
            });
    </script>
</body>
</html>
    `);
});

// API endpoint for bot status
app.get('/api/status', (req, res) => {
    const uptime = botStatus.startTime 
        ? formatUptime(Date.now() - botStatus.startTime.getTime())
        : 'Not started';
    
    res.json({
        isRunning: botStatus.isRunning,
        uptime: uptime,
        restarts: botStatus.restarts,
        lastError: botStatus.lastError,
        serverTime: new Date().toISOString()
    });
});

// Health check endpoint (for hosting services)
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', bot: botStatus.isRunning });
});

// Ping endpoint (keeps server alive)
app.get('/ping', (req, res) => {
    res.send('pong');
});

// Daily Game page
app.get('/dailygame', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'daily-game.html'));
});

// API endpoint to get user data
app.get('/api/user', (req, res) => {
    const userId = req.query.userId;
    
    if (!userId) {
        return res.status(400).json({ error: 'userId parameter required' });
    }
    
    const dataPath = path.join(__dirname, 'data');
    const userFile = path.join(dataPath, `${userId}.json`);
    
    if (fs.existsSync(userFile)) {
        try {
            const userData = JSON.parse(fs.readFileSync(userFile, 'utf8'));
            res.json(userData);
        } catch (error) {
            console.error(`❌ Error reading user data for ${userId}:`, error.message);
            res.status(500).json({ error: 'Failed to read user data' });
        }
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Format uptime
function formatUptime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
}

// Start web server
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    
    // Start the Discord bot
    startBot();
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (botProcess) {
        botProcess.kill();
    }
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (botProcess) {
        botProcess.kill();
    }
    process.exit(0);
});
