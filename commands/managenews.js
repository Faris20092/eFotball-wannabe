const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'data', 'news.json');
const ADMIN_IDS = process.env.ADMIN_IDS ? process.env.ADMIN_IDS.split(',') : [];

// Ensure news file exists
function ensureNewsFile() {
    const dataDir = path.join(__dirname, '..', 'data');
    if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
    }
    if (!fs.existsSync(NEWS_FILE)) {
        fs.writeFileSync(NEWS_FILE, JSON.stringify({ news: [] }, null, 2));
    }
}

// Load news
function loadNews() {
    ensureNewsFile();
    const data = fs.readFileSync(NEWS_FILE, 'utf8');
    return JSON.parse(data);
}

// Save news
function saveNews(newsData) {
    fs.writeFileSync(NEWS_FILE, JSON.stringify(newsData, null, 2));
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
                    option.setName('type')
                        .setDescription('Type of news')
                        .setRequired(true)
                        .addChoices(
                            { name: '🔄 Update', value: 'update' },
                            { name: '🎉 Event', value: 'event' },
                            { name: '🔧 Maintenance', value: 'maintenance' },
                            { name: '📢 Announcement', value: 'announcement' },
                            { name: '✨ New Feature', value: 'feature' },
                            { name: '🐛 Bug Fix', value: 'bugfix' }
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
                .addIntegerOption(option =>
                    option.setName('id')
                        .setDescription('News ID to remove')
                        .setRequired(true)
                        .setMinValue(1)))
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
            const newsData = loadNews();
            
            if (subcommand === 'add') {
                const type = interaction.options.getString('type');
                const title = interaction.options.getString('title');
                const content = interaction.options.getString('content');
                
                const newNews = {
                    id: newsData.news.length > 0 ? Math.max(...newsData.news.map(n => n.id)) + 1 : 1,
                    type: type,
                    title: title,
                    content: content,
                    date: new Date().toISOString(),
                    author: interaction.user.tag
                };
                
                newsData.news.push(newNews);
                saveNews(newsData);
                
                const typeEmoji = {
                    'update': '🔄',
                    'event': '🎉',
                    'maintenance': '🔧',
                    'announcement': '📢',
                    'feature': '✨',
                    'bugfix': '🐛'
                };
                
                const embed = new EmbedBuilder()
                    .setColor('#27ae60')
                    .setTitle('✅ News Article Created')
                    .setDescription('The news article has been successfully added!')
                    .addFields(
                        { name: 'ID', value: `#${newNews.id}`, inline: true },
                        { name: 'Type', value: `${typeEmoji[type]} ${type}`, inline: true },
                        { name: 'Title', value: title, inline: false },
                        { name: 'Content', value: content, inline: false }
                    )
                    .setFooter({ text: `Created by ${interaction.user.tag}` })
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'remove') {
                const id = interaction.options.getInteger('id');
                const newsIndex = newsData.news.findIndex(n => n.id === id);
                
                if (newsIndex === -1) {
                    return interaction.reply({
                        content: `❌ No news article found with ID #${id}.`,
                        ephemeral: true
                    });
                }
                
                const removedNews = newsData.news[newsIndex];
                newsData.news.splice(newsIndex, 1);
                saveNews(newsData);
                
                const embed = new EmbedBuilder()
                    .setColor('#e74c3c')
                    .setTitle('🗑️ News Article Removed')
                    .setDescription(`Successfully removed news article #${id}`)
                    .addFields(
                        { name: 'Title', value: removedNews.title, inline: false },
                        { name: 'Content', value: removedNews.content, inline: false }
                    )
                    .setTimestamp();
                
                await interaction.reply({ embeds: [embed] });
                
            } else if (subcommand === 'list') {
                if (newsData.news.length === 0) {
                    return interaction.reply({
                        content: '📰 No news articles found.',
                        ephemeral: true
                    });
                }
                
                const sortedNews = newsData.news.sort((a, b) => new Date(b.date) - new Date(a.date));
                
                const embed = new EmbedBuilder()
                    .setColor('#3498db')
                    .setTitle('📋 All News Articles')
                    .setDescription(`Total: ${sortedNews.length} article(s)`)
                    .setTimestamp();
                
                sortedNews.forEach(news => {
                    const newsDate = new Date(news.date);
                    const formattedDate = newsDate.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                    });
                    
                    const typeEmoji = {
                        'update': '🔄',
                        'event': '🎉',
                        'maintenance': '🔧',
                        'announcement': '📢',
                        'feature': '✨',
                        'bugfix': '🐛'
                    };
                    
                    const emoji = typeEmoji[news.type] || '📰';
                    
                    embed.addFields({
                        name: `#${news.id} - ${emoji} ${news.title}`,
                        value: `${news.content.substring(0, 100)}${news.content.length > 100 ? '...' : ''}\n*${formattedDate}*`,
                        inline: false
                    });
                });
                
                await interaction.reply({ embeds: [embed], ephemeral: true });
                
            } else if (subcommand === 'clear') {
                const count = newsData.news.length;
                newsData.news = [];
                saveNews(newsData);
                
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
