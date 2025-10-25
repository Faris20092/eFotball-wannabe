require('dotenv').config();
const express = require('express');
const session = require('express-session');
const BetterSqlite3Store = require('express-session-better-sqlite3')(session);
const passport = require('passport');
const DiscordStrategy = require('passport-discord').Strategy;
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const CALLBACK_URL = process.env.CALLBACK_URL || `http://localhost:${PORT}/auth/discord/callback`;

// Bot process management
let botProcess = null;
let botStatus = {
    isRunning: false,
    startTime: null,
    restarts: 0,
    lastError: null
};

// Discord OAuth2 Strategy
passport.use(new DiscordStrategy({
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: CALLBACK_URL,
    scope: ['identify', 'guilds']
}, (accessToken, refreshToken, profile, done) => {
    return done(null, profile);
}));

passport.serializeUser((user, done) => {
    done(null, user);
});

passport.deserializeUser((obj, done) => {
    done(null, obj);
});

// Middleware
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    store: new BetterSqlite3Store({
        path: path.join(__dirname, 'sessions.db'),
        ttl: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    }),
    secret: process.env.SESSION_SECRET || 'efotball-secret-key-change-this',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 7 * 24 * 60 * 60 * 1000 } // 7 days
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Helper: Get user data from bot's data directory
function getUserData(userId) {
    const dataPath = path.join(__dirname, 'data');
    const userFile = path.join(dataPath, `${userId}.json`);
    
    if (fs.existsSync(userFile)) {
        return JSON.parse(fs.readFileSync(userFile, 'utf8'));
    }
    return null;
}

// Helper: Save user data
function setUserData(userId, data) {
    const dataPath = path.join(__dirname, 'data');
    if (!fs.existsSync(dataPath)) {
        fs.mkdirSync(dataPath);
    }
    const userFile = path.join(dataPath, `${userId}.json`);
    fs.writeFileSync(userFile, JSON.stringify(data, null, 2));
}

// Helper: Get all players data
function getAllPlayers() {
    const playersFile = path.join(__dirname, 'players.json');
    if (fs.existsSync(playersFile)) {
        return JSON.parse(fs.readFileSync(playersFile, 'utf8'));
    }
    return [];
}

// Middleware: Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/login');
}

// Start Discord bot
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
        console.log(`⚠️ Bot process exited with code ${code}`);
        botStatus.isRunning = false;
        
        if (code !== 0) {
            botStatus.restarts++;
            console.log(`🔄 Restarting bot... (Restart #${botStatus.restarts})`);
            setTimeout(startBot, 5000);
        }
    });
}

// Routes
app.get('/', (req, res) => {
    if (req.isAuthenticated()) {
        return res.redirect('/dashboard');
    }
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Discord OAuth2 routes
app.get('/auth/discord', passport.authenticate('discord'));

app.get('/auth/discord/callback', 
    passport.authenticate('discord', { failureRedirect: '/login' }),
    (req, res) => {
        res.redirect('/dashboard');
    }
);

app.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        res.redirect('/');
    });
});

// Dashboard route
app.get('/dashboard', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// Contracts route
app.get('/contracts', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'contracts.html'));
});

// My Team route
app.get('/my-team', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'my-team.html'));
});

// Mail route
app.get('/mail', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'mail.html'));
});

// News route
app.get('/news', isAuthenticated, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'news.html'));
});

// API Routes
app.get('/api/user', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    res.json({
        discord: req.user,
        gameData: userData
    });
});

app.get('/api/players', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData || !userData.players) {
        return res.json({ players: [] });
    }
    res.json({ players: userData.players });
});

app.get('/api/squad', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData) {
        return res.json({ squad: { main: [], bench: [] }, formation: '4-3-3' });
    }
    res.json({
        squad: userData.squad || { main: [], bench: [] },
        formation: userData.formation || '4-3-3'
    });
});

app.post('/api/squad/update', isAuthenticated, (req, res) => {
    try {
        const userData = getUserData(req.user.id);
        if (!userData) {
            return res.status(404).json({ error: 'User data not found' });
        }

        const { squad, formation } = req.body;
        
        if (squad) {
            userData.squad = squad;
        }
        if (formation) {
            userData.formation = formation;
        }

        setUserData(req.user.id, userData);
        res.json({ success: true, message: 'Squad updated successfully!' });
    } catch (error) {
        console.error('Error updating squad:', error);
        res.status(500).json({ error: 'Failed to update squad' });
    }
});

app.get('/api/all-players', isAuthenticated, (req, res) => {
    const allPlayers = getAllPlayers();
    res.json({ players: allPlayers });
});

// Packs API endpoint
app.get('/api/packs', isAuthenticated, (req, res) => {
    const PACKS = {
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
    res.json({ packs: PACKS });
});

// Mail API endpoints
app.get('/api/mail', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    if (!userData) {
        return res.json({ mail: [] });
    }
    res.json({ mail: userData.mail || [] });
});

app.post('/api/mail/claim', isAuthenticated, (req, res) => {
    const { mailId } = req.body;
    const userData = getUserData(req.user.id);
    
    console.log('Claim request for mail ID:', mailId);
    console.log('User has mail:', userData?.mail?.length || 0);
    
    if (!userData || !userData.mail) {
        return res.json({ success: false, message: 'No mail found' });
    }
    
    // Find mail with flexible ID comparison (string or number)
    const mail = userData.mail.find(m => m.id == mailId || m.id === mailId);
    if (!mail) {
        console.log('Mail not found. Available IDs:', userData.mail.map(m => m.id));
        return res.json({ success: false, message: 'Mail not found' });
    }
    
    if (mail.claimed) {
        return res.json({ success: false, message: 'Already claimed' });
    }
    
    console.log('Claiming mail:', mail.title || mail.type);
    
    // Mark as claimed
    mail.claimed = true;
    
    // Handle new format (rewards object)
    if (mail.rewards) {
        if (mail.rewards.gp) {
            userData.gp = (userData.gp || 0) + mail.rewards.gp;
        }
        if (mail.rewards.eCoins) {
            userData.eCoins = (userData.eCoins || 0) + mail.rewards.eCoins;
        }
        if (mail.rewards.players && mail.rewards.players.length > 0) {
            userData.players = userData.players || [];
            userData.players.push(...mail.rewards.players);
        }
        if (mail.rewards.packs && mail.rewards.packs.length > 0) {
            userData.inventory = userData.inventory || {};
            mail.rewards.packs.forEach(pack => {
                const packKey = `${pack}Pack`;
                userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
            });
        }
    }
    // Handle old format (type, amount, rarity fields)
    else if (mail.type) {
        if (mail.type === 'gp' && mail.amount) {
            userData.gp = (userData.gp || 0) + mail.amount;
        }
        else if (mail.type === 'eCoins' && mail.amount) {
            userData.eCoins = (userData.eCoins || 0) + mail.amount;
        }
        else if (mail.type === 'pack' && mail.rarity) {
            userData.inventory = userData.inventory || {};
            const packKey = `${mail.rarity}Pack`;
            userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
        }
        else if (mail.type === 'trainer' && mail.trainerName) {
            // Add trainer to inventory or handle as needed
            userData.inventory = userData.inventory || {};
            userData.inventory.trainers = userData.inventory.trainers || [];
            userData.inventory.trainers.push(mail.trainerName);
        }
    }
    
    setUserData(req.user.id, userData);
    
    res.json({
        success: true,
        rewards: mail.rewards,
        newBalance: {
            gp: userData.gp,
            eCoins: userData.eCoins
        }
    });
});

app.post('/api/mail/claim-all', isAuthenticated, (req, res) => {
    const userData = getUserData(req.user.id);
    
    if (!userData || !userData.mail) {
        return res.json({ success: false, message: 'No mail found' });
    }
    
    let claimedCount = 0;
    const totalRewards = {
        gp: 0,
        eCoins: 0,
        players: 0,
        packs: 0
    };
    
    userData.mail.forEach(mail => {
        if (!mail.claimed) {
            mail.claimed = true;
            claimedCount++;
            
            // Handle new format (rewards object)
            if (mail.rewards) {
                if (mail.rewards.gp) {
                    userData.gp = (userData.gp || 0) + mail.rewards.gp;
                    totalRewards.gp += mail.rewards.gp;
                }
                if (mail.rewards.eCoins) {
                    userData.eCoins = (userData.eCoins || 0) + mail.rewards.eCoins;
                    totalRewards.eCoins += mail.rewards.eCoins;
                }
                if (mail.rewards.players && mail.rewards.players.length > 0) {
                    userData.players = userData.players || [];
                    userData.players.push(...mail.rewards.players);
                    totalRewards.players += mail.rewards.players.length;
                }
                if (mail.rewards.packs && mail.rewards.packs.length > 0) {
                    userData.inventory = userData.inventory || {};
                    mail.rewards.packs.forEach(pack => {
                        const packKey = `${pack}Pack`;
                        userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
                    });
                    totalRewards.packs += mail.rewards.packs.length;
                }
            }
            // Handle old format (type, amount, rarity fields)
            else if (mail.type) {
                if (mail.type === 'gp' && mail.amount) {
                    userData.gp = (userData.gp || 0) + mail.amount;
                    totalRewards.gp += mail.amount;
                }
                else if (mail.type === 'eCoins' && mail.amount) {
                    userData.eCoins = (userData.eCoins || 0) + mail.amount;
                    totalRewards.eCoins += mail.amount;
                }
                else if (mail.type === 'pack' && mail.rarity) {
                    userData.inventory = userData.inventory || {};
                    const packKey = `${mail.rarity}Pack`;
                    userData.inventory[packKey] = (userData.inventory[packKey] || 0) + 1;
                    totalRewards.packs += 1;
                }
                else if (mail.type === 'trainer' && mail.trainerName) {
                    userData.inventory = userData.inventory || {};
                    userData.inventory.trainers = userData.inventory.trainers || [];
                    userData.inventory.trainers.push(mail.trainerName);
                }
            }
        }
    });
    
    setUserData(req.user.id, userData);
    
    res.json({
        success: true,
        claimedCount,
        totalRewards,
        newBalance: {
            gp: userData.gp,
            eCoins: userData.eCoins
        }
    });
});

// News API endpoint
app.get('/api/news', (req, res) => {
    const newsFile = path.join(__dirname, 'news.json');
    if (fs.existsSync(newsFile)) {
        const newsData = JSON.parse(fs.readFileSync(newsFile, 'utf8'));
        res.json({ news: newsData });
    } else {
        res.json({ news: [] });
    }
});

// Bot status API
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

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok', bot: botStatus.isRunning });
});

app.get('/ping', (req, res) => {
    res.send('pong');
});

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

// Start server
app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔐 Login URL: http://localhost:${PORT}/auth/discord`);
    
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
