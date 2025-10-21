# 🌐 Web Dashboard Setup Guide

Your eFotball bot now has a **full web dashboard** where users can:
- ✅ Login with Discord OAuth2
- ✅ View their player collection
- ✅ Build and manage their squad visually
- ✅ Drag-and-drop squad builder
- ✅ See stats and currency

---

## 🚀 Quick Setup

### **Step 1: Get Discord OAuth2 Credentials**

1. Go to **Discord Developer Portal**: https://discord.com/developers/applications
2. Select your application (or create a new one)
3. Go to **"OAuth2"** section on the left
4. Click **"Add Redirect"** and add:
   - For local testing: `http://localhost:3000/auth/discord/callback`
   - For production: `https://your-app-url.com/auth/discord/callback`
5. Copy your **Client ID** and **Client Secret**

### **Step 2: Update Environment Variables**

Add these to your `.env` file (or Replit Secrets):

```env
# Your existing bot token
DISCORD_TOKEN=your_bot_token_here

# New OAuth2 credentials
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_CLIENT_SECRET=your_client_secret_here

# Callback URL (update for production)
CALLBACK_URL=http://localhost:3000/auth/discord/callback

# Session secret (any random string)
SESSION_SECRET=my-super-secret-key-12345
```

### **Step 3: Install Dependencies**

```bash
npm install
```

### **Step 4: Start the Server**

```bash
npm start
```

### **Step 5: Access the Dashboard**

1. Open your browser: `http://localhost:3000`
2. Click **"Login with Discord"**
3. Authorize the application
4. You'll be redirected to your dashboard!

---

## 🎯 Features

### **Home Page** (`/`)
- Beautiful landing page
- Login with Discord button
- Feature showcase

### **Dashboard** (`/dashboard`)
- **Overview Tab**: View GP, eCoins, player count, team rating
- **Squad Builder Tab**: 
  - Visual football pitch
  - Drag-and-drop interface (coming soon)
  - Formation selector (4-3-3, 4-4-2, 3-5-2, 4-2-3-1)
  - Bench management
  - Save squad to sync with Discord bot
- **My Players Tab**:
  - View all your players
  - Filter by rarity, position, name
  - Click to see detailed stats

---

## 🔧 For Replit Deployment

### **1. Add Secrets in Replit**

Click the 🔒 **Secrets** tab and add:

| Key | Value |
|-----|-------|
| `DISCORD_TOKEN` | Your bot token |
| `DISCORD_CLIENT_ID` | Your OAuth2 Client ID |
| `DISCORD_CLIENT_SECRET` | Your OAuth2 Client Secret |
| `CALLBACK_URL` | `https://your-repl.repl.co/auth/discord/callback` |
| `SESSION_SECRET` | Any random string |

### **2. Update Discord Developer Portal**

1. Go to your Discord application
2. OAuth2 → Redirects
3. Add: `https://your-repl-name.your-username.repl.co/auth/discord/callback`
4. Save changes

### **3. Run the Bot**

Click the **Run** button in Replit!

---

## 🌐 For Render.com Deployment

### **1. Add Environment Variables**

In Render dashboard, add:
- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_CLIENT_SECRET`
- `CALLBACK_URL` = `https://your-app.onrender.com/auth/discord/callback`
- `SESSION_SECRET`

### **2. Update Discord Redirect URI**

Add `https://your-app.onrender.com/auth/discord/callback` to Discord OAuth2 redirects

### **3. Deploy**

Render will automatically deploy your app!

---

## 📱 API Endpoints

Your web server provides these API endpoints:

### **Authentication**
- `GET /auth/discord` - Start Discord OAuth2 flow
- `GET /auth/discord/callback` - OAuth2 callback
- `GET /logout` - Logout user

### **User Data**
- `GET /api/user` - Get current user info
- `GET /api/players` - Get user's players
- `GET /api/squad` - Get user's squad
- `POST /api/squad/update` - Update squad

### **Bot Status**
- `GET /api/status` - Bot status (uptime, restarts)
- `GET /health` - Health check
- `GET /ping` - Keep-alive endpoint

---

## 🎨 Customization

### **Change Colors**

Edit `public/styles.css`:

```css
:root {
    --primary: #667eea;  /* Main color */
    --secondary: #764ba2; /* Secondary color */
    --success: #27ae60;   /* Success color */
}
```

### **Add More Features**

The dashboard is built with vanilla JavaScript, making it easy to extend:

1. **Add new tabs**: Edit `public/dashboard.html`
2. **Add new API endpoints**: Edit `web-server.js`
3. **Add new functionality**: Edit `public/dashboard.js`

---

## 🔒 Security Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Use strong SESSION_SECRET** - Generate a random string
3. **HTTPS in production** - Always use HTTPS for OAuth2
4. **Validate user input** - Server-side validation is implemented

---

## 🐛 Troubleshooting

### **"401 Unauthorized" when logging in**
- Check your `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`
- Verify redirect URI matches in Discord Developer Portal

### **"Cannot find module" errors**
- Run `npm install` to install all dependencies
- Delete `node_modules` and `package-lock.json`, then reinstall

### **Squad not saving**
- Check browser console for errors
- Verify user data directory exists
- Check server logs

### **Players not showing**
- Ensure `players.json` exists and is valid JSON
- Check if user has players in their collection
- Use Discord bot commands to get players first

---

## 📊 How It Works

1. **User logs in** via Discord OAuth2
2. **Session is created** and stored server-side
3. **User data is loaded** from `data/{userId}.json`
4. **Dashboard displays** player collection and squad
5. **User makes changes** via web interface
6. **Changes are saved** to JSON files
7. **Discord bot reads** the same JSON files
8. **Everything stays in sync!** 🎉

---

## 🎯 Next Steps

1. ✅ Set up OAuth2 credentials
2. ✅ Add environment variables
3. ✅ Deploy to Replit/Render
4. ✅ Test the dashboard
5. ✅ Share with your Discord server!

---

## 💡 Tips

- **Mobile Responsive**: Dashboard works on phones and tablets
- **Real-time Sync**: Changes sync instantly with Discord bot
- **No Database Needed**: Uses JSON files (same as bot)
- **Easy to Deploy**: Works on all free hosting platforms

---

## 🆘 Need Help?

If you encounter issues:
1. Check the browser console (F12)
2. Check server logs
3. Verify all environment variables are set
4. Make sure Discord OAuth2 redirect URI is correct

---

**Your web dashboard is ready! 🎉⚽**

Users can now manage their squads visually instead of using Discord commands!
