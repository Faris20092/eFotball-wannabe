# News System Documentation

## Overview
The news system allows admins to create and manage game updates, announcements, and news that players can view using the `/news` command.

## Commands

### For Players: `/news`
View the latest game updates and news.

**Usage:**
- `/news` - View the first page of news
- `/news page:2` - View page 2 of news

**Features:**
- Shows 5 news articles per page
- Sorted by date (newest first)
- Color-coded by news type
- Shows author and timestamp

### For Admins: `/managenews`
Manage game news articles (Admin only).

**Subcommands:**

#### 1. Add News
`/managenews add type:<type> title:<title> content:<content>`

**News Types:**
- 🔄 **Update** - Game updates and patches
- 🎉 **Event** - Special events
- 🔧 **Maintenance** - Maintenance notices
- 📢 **Announcement** - General announcements
- ✨ **Feature** - New features
- 🐛 **Bug Fix** - Bug fixes

**Example:**
```
/managenews add type:update title:New Squad Builder content:We've added a new drag-and-drop squad builder to the web dashboard!
```

#### 2. Remove News
`/managenews remove id:<id>`

Remove a news article by its ID.

**Example:**
```
/managenews remove id:3
```

#### 3. List All News
`/managenews list`

View all news articles with their IDs (admin view only).

#### 4. Clear All News
`/managenews clear`

Remove all news articles. Use with caution!

## Data Storage

News is stored in `data/news.json` with the following structure:

```json
{
  "news": [
    {
      "id": 1,
      "type": "update",
      "title": "New Feature Released",
      "content": "We've added a new training system!",
      "date": "2025-10-24T09:38:00.000Z",
      "author": "Admin#1234"
    }
  ]
}
```

## Admin Setup

To use the `/managenews` command, you need either:
1. Discord Administrator permissions in the server, OR
2. Your Discord User ID added to the `ADMIN_IDS` environment variable in `.env`

**Example `.env` entry:**
```
ADMIN_IDS=123456789012345678,987654321098765432
```

## Example News Flow

1. **Admin creates news:**
   ```
   /managenews add type:event title:Double GP Weekend! content:Earn 2x GP from all matches this weekend! Don't miss out!
   ```

2. **Players view news:**
   ```
   /news
   ```
   
   They'll see:
   ```
   📰 eFOOTBALL WANNABE - Latest News
   
   🎉 Double GP Weekend!
   Earn 2x GP from all matches this weekend! Don't miss out!
   
   Oct 24, 2025, 05:38 PM • by Admin#1234
   ```

3. **Admin removes old news:**
   ```
   /managenews list  (to see IDs)
   /managenews remove id:5
   ```

## Best Practices

1. **Keep titles concise** (max 100 characters)
2. **Content should be clear** (max 1000 characters)
3. **Use appropriate news types** for easy filtering
4. **Remove outdated news** regularly to keep the feed relevant
5. **Add important updates** like maintenance schedules, events, and new features

## News Types Guide

- **Update** 🔄 - Version updates, balance changes, system improvements
- **Event** 🎉 - Limited-time events, special promotions, celebrations
- **Maintenance** 🔧 - Scheduled maintenance, downtime notices
- **Announcement** 📢 - General announcements, community updates
- **Feature** ✨ - New features, new content additions
- **Bug Fix** 🐛 - Bug fixes, issue resolutions
