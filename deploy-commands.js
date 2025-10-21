require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const commands = [];

// Auto-load all commands from commands/ directory
const commandsDir = path.join(__dirname, 'commands');
const files = fs.readdirSync(commandsDir).filter(f => f.endsWith('.js'));
for (const file of files) {
  try {
    const cmd = require(path.join(commandsDir, file));
    if (cmd && cmd.data && typeof cmd.data.name === 'string' && typeof cmd.data.toJSON === 'function') {
      commands.push(cmd.data.toJSON());
    }
  } catch (e) {
    console.error('Failed to load command from', file, e?.message || e);
  }
}

// Deploy commands
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Started refreshing ${commands.length} application (/) commands.`);

        // Get application ID from the bot token
        const clientId = Buffer.from(process.env.DISCORD_TOKEN.split('.')[0], 'base64').toString();

        // Deploy commands globally
        const data = await rest.put(
            Routes.applicationCommands(clientId),
            { body: commands },
        );

        console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    } catch (error) {
        console.error(error);
    }
})();
