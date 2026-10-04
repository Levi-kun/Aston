const { REST, Routes } = require("discord.js");
const { clientId, guildId, token } = require("./config.json");
const fs = require("node:fs");
const path = require("node:path");
const rest = new REST().setToken(token);

/**
 * 
 * this is a dev tool to delete commands
 * activated with node delete-commands.js
 * 
 */

console.log(`Started deleting application (/) commands.`);
rest.put(Routes.applicationCommands(clientId, guildId), { body: [] })
    .then(() => console.log("Successfully deleted all application commands."))
    .catch(console.error);
