# Quick Start: News System

## Setup

1. **Deploy the new commands:**
   ```bash
   node deploy-commands.js
   ```

2. **Set admin permissions (optional):**
   Add your Discord User ID to `.env`:
   ```
   ADMIN_IDS=YOUR_DISCORD_USER_ID
   ```

## Usage Examples

### Creating Your First News Article

```
/managenews add type:announcement title:Welcome to eFOOTBALL WANNABE! content:Thank you for playing! Check out the new web dashboard at your server's URL.
```

### Creating Different Types of News

**Game Update:**
```
/managenews add type:update title:Version 1.2 Released content:New features: Squad Builder, My Team page, and special Iconic/Legend card backgrounds!
```

**Special Event:**
```
/managenews add type:event title:Weekend GP Bonus content:Earn 2x GP from all matches this weekend! Event runs from Friday to Sunday.
```

**Maintenance Notice:**
```
/managenews add type:maintenance title:Scheduled Maintenance content:Server will be down for maintenance on Sunday 2AM-4AM UTC. Please save your progress.
```

**New Feature:**
```
/managenews add type:feature title:Contracts Page Added content:View all available players in each pack! Check the new Contracts page on the web dashboard.
```

**Bug Fix:**
```
/managenews add type:bugfix title:Squad Builder Fixed content:Fixed an issue where Iconic and Legend players weren't showing their special backgrounds.
```

### Managing News

**View all news with IDs:**
```
/managenews list
```

**Remove a specific news:**
```
/managenews remove id:3
```

**Clear all news (careful!):**
```
/managenews clear
```

### Players Viewing News

**View latest news:**
```
/news
```

**View page 2:**
```
/news page:2
```

## Sample News Feed

Here's what players will see when they use `/news`:

```
📰 eFOOTBALL WANNABE - Latest News
Stay updated with the latest game updates, events, and announcements!

✨ Contracts Page Added
View all available players in each pack! Check the new Contracts page on the web dashboard.
Oct 24, 2025, 05:38 PM • by Admin#1234

🔄 Version 1.2 Released
New features: Squad Builder, My Team page, and special Iconic/Legend card backgrounds!
Oct 24, 2025, 03:15 PM • by Admin#1234

🎉 Weekend GP Bonus
Earn 2x GP from all matches this weekend! Event runs from Friday to Sunday.
Oct 23, 2025, 10:00 AM • by Admin#1234

📢 Welcome to eFOOTBALL WANNABE!
Thank you for playing! Check out the new web dashboard at your server's URL.
Oct 22, 2025, 09:00 PM • by Admin#1234

Page 1/1 • Total News: 4
```

## Tips

1. **Keep news current** - Remove old events and outdated information
2. **Use clear titles** - Make it easy to understand at a glance
3. **Be concise** - Players appreciate brief, informative updates
4. **Use appropriate types** - Helps players quickly identify important news
5. **Regular updates** - Keep your community engaged with frequent news

## Troubleshooting

**Command not showing up?**
- Run `node deploy-commands.js` to register the commands
- Wait a few minutes for Discord to update

**Permission denied?**
- Make sure you have Administrator permission in Discord
- OR add your User ID to `ADMIN_IDS` in `.env`

**News not saving?**
- Check that the `data/` folder exists
- The system will create `news.json` automatically on first use
