const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'news.json');
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];

// Ensure news file exists
function ensureNewsFile() {
    if (!fs.existsSync(NEWS_FILE)) {
        fs.writeFileSync(NEWS_FILE, JSON.stringify([], null, 2));
    }
}

// Load news
function loadNews() {
    ensureNewsFile();
    const data = fs.readFileSync(NEWS_FILE, 'utf8');
    return JSON.parse(data);
}

// Save news
function saveNews(newsArray) {
    fs.writeFileSync(NEWS_FILE, JSON.stringify(newsArray, null, 2));
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('managenews')
        .setDescription('Manage game news (Admin only)')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a new news article')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Category of news')
                        .setRequired(true)
                        .addChoices(
                            { name: '⬆️ Update', value: 'Update' },
                            { name: '✕ Issue', value: 'Issue' },
                            { name: '🎉 Event', value: 'Event' },
                            { name: '🔧 Maintenance', value: 'Maintenance' },
                            { name: '📢 Announcement', value: 'Announcement' }
                        ))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('News title')
                        .setRequired(true)
                        .setMaxLength(100))
                .addStringOption(option =>
                    option.setName('content')
                        .setDescription('News content/description')
                        .setRequired(true)
                        .setMaxLength(1000)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a news article by ID')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('News ID to remove (e.g., news_001)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all news articles with IDs'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('clear')
                .setDescription('Clear all news articles (use with caution!)')),
    
    async execute(interaction) {
        // Check if user is admin
        if (!ADMIN_IDS.includes(interaction.user.id) && !interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return interaction.reply({
                content: '❌ You do not have permission to use this command.',
                ephemeral: true
            });
        }
        
        const subcommand = interaction.options.getSubcommand();
        
        try {
            const newsArray = loadNews();
            
            if (subcommand === 'add') {
                const category = interaction.options.getString('category');
                const title = interaction.options.getString('title');
                const content = interaction.options.getString('content');
                
                // Generate unique ID
                const existingIds = newsArray.map(n => parseInt(n.id.replace('news_', '')));
                const nextId = existingIds.length > 0 ? Math.max(...existingIds) + 1 : 1;
                
                const newNews = {
                    id: `news_${String(nextId).padStart(3, '0')}`,
                    title: title,
                    category: category,
                    preview: content.substring(0, 60) + (content.length > 60 ? '...' : ''),
                    content: content,
                    date: new Date().toISOString()
                };
                
                newsArray.push(newNews);
                saveNews(newsArray);
                
                const categoryEmoji = {
                    'Update': '⬆️',
                    'Issue': '✕',
                    'Event': '🎉',
                    'Maintenance': '🔧',
                    'Announcement': '📢'
                };
                
                const embed = new EmbedBuilder()
                    .setColor('#27ae60')
                    .setTitle('✅ News Article Created')
                    .setDescription('The news article has been successfully added to the website!')
                    .addFields(
                        { name: 'ID', value: newNews.id, inline: true },
                        { name: 'Category', value: `${categoryEmoji[category]} ${category}`, inline: true },
                        { name: 'Title', value: title, inline: false },
                        { name: 'Content', value: content, inline: false }
                    )
                    .setFooter({ text: `Created by ${interaction.user.tag}` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'remove') {
                const id = interaction.options.getString('id');
                const newsIndex = newsArray.findIndex(n => n.id === id);
                
                if (newsIndex === -1) {
                    return interaction.reply({
                        content: `❌ No news article found with ID ${id}.`,
                        ephemeral: true
                    });
                }
                
                const removedNews = newsArray[newsIndex];
                newsArray.splice(newsIndex, 1);
                saveNews(newsArray);
                
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🗑️ News Article Removed')
                    .setDescription(`Successfully removed news article ${id}`)
                    .addFields(
                        { name: 'Title', value: removedNews.title, inline: false },
                        { name: 'Content', value: removedNews.content, inline: false }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'list') {
                if (newsArray.length === 0) {
                    return interaction.reply({
                        content: '📰 No news articles found.',
                        ephemeral: true
                    });
                }
                
                const sortedNews = newsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('📋 All News Articles')
                    .setDescription(`Total: ${sortedNews.length} article(s)`)
                    .setTimestamp();
                
                const categoryEmoji = {
                    'Update': '⬆️',
                    'Issue': '✕',
                    'Event': '🎉',
                    'Maintenance': '🔧',
                    'Announcement': '📢'
                };
                
                sortedNews.forEach(news => {
                    const newsDate = new Date(news.date);
                    const formattedDate = newsDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    const emoji = categoryEmoji[news.category] || '📰';
                    
                    embed.addFields({
                        name: `${news.id} - ${emoji} ${news.title}`,
                        value: `${news.preview || news.content.substring(0, 100)}\n*${formattedDate}*`,
                        inline: false
                    });
                });
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                
            } else if (subcommand === 'clear') {
                const count = newsArray.length;
                saveNews([]);
                
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🗑️ All News Cleared')
                    .setDescription(`Successfully removed ${count} news article(s).`)
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
            }
            
        } catch (error) {
            console.error('Error in managenews command:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing news.',
                ephemeral: true
            });
        }
    }
};
