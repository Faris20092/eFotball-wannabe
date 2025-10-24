const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'data', 'news.json');

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

module.exports = {
    data: new SlashCommandBuilder()
        .setName('news')
        .setDescription('View the latest game updates and news')
        .addIntegerOption(option =>
            option.setName('page')
                .setDescription('Page number to view')
                .setRequired(false)
                .setMinValue(1)),
    
    async execute(interaction) {
        try {
            const newsData = loadNews();
            const allNews = newsData.news || [];
            
            if (allNews.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#0014DC')
                            .setTitle('📰 Game News')
                            .setDescription('No news available at the moment. Check back later!')
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }
            
            // Sort news by date (newest first)
            const sortedNews = allNews.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            const page = interaction.options.getInteger('page') || 1;
            const itemsPerPage = 5;
            const totalPages = Math.ceil(sortedNews.length / itemsPerPage);
            
            if (page > totalPages) {
                return interaction.reply({
                    content: `❌ Invalid page number. There are only ${totalPages} page(s) of news.`,
                    ephemeral: true
                });
            }
            
            const startIndex = (page - 1) * itemsPerPage;
            const endIndex = startIndex + itemsPerPage;
            const pageNews = sortedNews.slice(startIndex, endIndex);
            
            const embed = new EmbedBuilder()
                .setColor('#FFED00')
                .setTitle('📰 eFOOTBALL WANNABE - Latest News')
                .setDescription('Stay updated with the latest game updates, events, and announcements!')
                .setFooter({ text: `Page ${page}/${totalPages} • Total News: ${sortedNews.length}` })
                .setTimestamp();
            
            pageNews.forEach((news, index) => {
                const newsDate = new Date(news.date);
                const formattedDate = newsDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
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
                    name: `${emoji} ${news.title}`,
                    value: `${news.content}\n\n*${formattedDate}*${news.author ? ` • by ${news.author}` : ''}`,
                    inline: false
                });
            });
            
            await interaction.reply({ embeds: [embed] });
            
        } catch (error) {
            console.error('Error in news command:', error);
            await interaction.reply({
                content: '❌ An error occurred while fetching the news.',
                ephemeral: true
            });
        }
    }
};
