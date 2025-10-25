const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const path = require('path');

const NEWS_FILE = path.join(__dirname, '..', 'news.json');

// Load news
function loadNews() {
    if (!fs.existsSync(NEWS_FILE)) {
        return [];
    }
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
            const newsArray = loadNews();
            
            if (newsArray.length === 0) {
                return interaction.reply({
                    embeds: [
                        new EmbedBuilder()
                            .setColor('#0014DC')
                            .setTitle('📰 Game News')
                            .setDescription('No news available at the moment. Check back later!\n\nVisit the website for more: http://localhost:3000/news')
                            .setTimestamp()
                    ],
                    ephemeral: true
                });
            }
            
            // Sort news by date (newest first)
            const sortedNews = newsArray.sort((a, b) => new Date(b.date) - new Date(a.date));
            
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
                .setDescription('Stay updated with the latest game updates, events, and announcements!\n\n')
                .setFooter({ text: `Page ${page}/${totalPages} • Total News: ${sortedNews.length}` })
                .setTimestamp();
            
            const categoryEmoji = {
                'Update': '⬆️',
                'Issue': '✕',
                'Event': '🎉',
                'Maintenance': '🔧',
                'Announcement': '📢'
            };
            
            pageNews.forEach((news) => {
                const newsDate = new Date(news.date);
                const formattedDate = newsDate.toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                });
                
                const emoji = categoryEmoji[news.category] || '📰';
                
                embed.addFields({
                    name: `${emoji} ${news.title}`,
                    value: `${news.content}\n\n*${formattedDate}*`,
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
