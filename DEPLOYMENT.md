# 🚀 Deploy eFotball Discord Bot 24/7

Your bot now has a web server that keeps it online 24/7! Here are your deployment options:

## 📋 Prerequisites

Before deploying, make sure you have:
- ✅ Discord Bot Token (in `.env` file)
- ✅ All files committed to a Git repository (GitHub recommended)

---

## 🌐 Option 1: Render.com (RECOMMENDED - Free & Easy)

**Why Render?** Free tier, auto-deploys from GitHub, keeps bot running 24/7

### Steps:

1. **Create a GitHub Repository**
   - Go to https://github.com/new
   - Create a new repository (e.g., `efotball-bot`)
   - Push your code:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git branch -M main
     git remote add origin https://github.com/YOUR_USERNAME/efotball-bot.git
     git push -u origin main
     ```

2. **Deploy to Render**
   - Go to https://render.com
   - Sign up/Login with GitHub
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure:
     - **Name:** efotball-bot
     - **Environment:** Node
     - **Build Command:** `npm install`
     - **Start Command:** `npm start`
     - **Plan:** Free
   - Add Environment Variable:
     - Key: `DISCORD_TOKEN`
     - Value: (paste your Discord bot token)
   - Click "Create Web Service"

3. **Done!** Your bot will be live at: `https://efotball-bot.onrender.com`

**Note:** Free tier may sleep after 15 min of inactivity. Use UptimeRobot (below) to keep it awake!

---

## 🔄 Option 2: Railway.app (Easy, $5 free credit)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repository
5. Add environment variable: `DISCORD_TOKEN`
6. Railway will auto-detect and deploy!

**Your bot URL:** `https://your-app.up.railway.app`

---

## 💻 Option 3: Replit (Easiest for beginners)

1. Go to https://replit.com
2. Click "Create Repl" → "Import from GitHub"
3. Paste your GitHub repo URL
4. In "Secrets" tab (🔒), add:
   - Key: `DISCORD_TOKEN`
   - Value: (your token)
5. Click "Run" button
6. Keep the Repl tab open or use "Always On" (paid feature)

**Your bot URL:** `https://your-repl.your-username.repl.co`

---

## 🤖 Option 4: Heroku (Classic option)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Login: `heroku login`
3. Create app:
   ```bash
   heroku create efotball-bot
   heroku config:set DISCORD_TOKEN=your_token_here
   git push heroku main
   ```

**Your bot URL:** `https://efotball-bot.herokuapp.com`

---

## ⏰ Keep Your Bot Awake 24/7 (For Free Tier)

Free hosting services may sleep after inactivity. Use **UptimeRobot** to ping your bot every 5 minutes:

1. Go to https://uptimerobot.com
2. Sign up (free)
3. Add New Monitor:
   - **Monitor Type:** HTTP(s)
   - **Friendly Name:** eFotball Bot
   - **URL:** Your deployed URL + `/ping` (e.g., `https://efotball-bot.onrender.com/ping`)
   - **Monitoring Interval:** 5 minutes
4. Save!

Your bot will now stay awake 24/7! 🎉

---

## 📊 Access Your Dashboard

Once deployed, visit your bot's URL to see the status dashboard:
- `https://your-app-url.com` - Beautiful status page
- `https://your-app-url.com/api/status` - JSON status API
- `https://your-app-url.com/health` - Health check
- `https://your-app-url.com/ping` - Keep-alive endpoint

---

## 🔧 Local Testing

Test the web server locally before deploying:

```bash
# Install dependencies (if not done)
npm install

# Start the server
npm start
```

Visit: http://localhost:3000

---

## 🐛 Troubleshooting

### Bot not starting?
- Check your `DISCORD_TOKEN` is correct
- View logs in your hosting dashboard
- Make sure all dependencies are installed

### Website shows but bot is offline?
- Check Discord Developer Portal - bot token is valid
- Verify environment variables are set correctly
- Check hosting service logs for errors

### Bot keeps restarting?
- Check for errors in the logs
- Ensure `players.json` exists and is valid JSON
- Verify all command files are present

---

## 📝 Environment Variables Needed

Make sure to set these in your hosting service:

| Variable | Description | Required |
|----------|-------------|----------|
| `DISCORD_TOKEN` | Your Discord bot token | ✅ Yes |
| `PORT` | Port for web server (auto-set by host) | ❌ No |

---

## 🎯 Next Steps

1. ✅ Deploy your bot using one of the options above
2. ✅ Set up UptimeRobot to keep it awake
3. ✅ Share your bot's invite link
4. ✅ Monitor the dashboard to see uptime and stats

---

## 💡 Tips

- **Free Tier Limits:** Most free tiers have limited resources. Your bot should work fine for small-medium servers.
- **Scaling:** If your bot grows, consider upgrading to paid tiers for better performance.
- **Backups:** The `data/` folder contains user data. Consider backing it up regularly.
- **Updates:** Push to GitHub and your hosting service will auto-deploy updates!

---

## 🆘 Need Help?

If you encounter issues:
1. Check the hosting service logs
2. Verify all files are committed to GitHub
3. Ensure environment variables are set correctly
4. Test locally first with `npm start`

---

**Your bot is now ready for 24/7 deployment! 🚀⚽**
