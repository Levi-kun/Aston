const { REST, Routes } = require("discord.js");


require("dotenv").config();


const rest = new REST().setToken(process.env.TOKEN);

/**
 * 
 * this is a dev tool to delete commands
 * activated with node delete-commands.js
 * 
 */

console.log(`Started deleting application (/) commands.`);
rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: [] })
    .then(() => console.log("Successfully deleted all application commands."))
    .catch(console.error);
