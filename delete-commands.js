const { REST, Routes } = require('discord.js');
const { clientId, guildId, token } = require('./config.json');
const fs = require('node:fs');
const path = require('node:path');

// Construct and prepare an instance of the REST module
const rest = new REST().setToken(token);

// and deploy your commands!
console.log(`Started deleting application (/) commands.`);

// The put method is used to fully refresh all commands in the guild with the current set
rest.put(Routes.applicationCommands(clientId,guildId), { body: [] })
	.then(() => console.log('Successfully deleted all application commands.'))
	.catch(console.error);
