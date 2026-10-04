const { REST, Routes } = require("discord.js");
const { clientId } = require("./config.json");

require("dotenv").config();

const token = process.env.TOKEN;
const fs = require("node:fs");
const path = require("node:path");
const commands = [];
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

/**
 * 
 * this is a dev tool to create/spawn commands
 * activated with node deploy-commands.js
 * 
 */


// This looks for the children of the commands/ folder
// This for loop constructes the path for each command to be imported

for (const folder of commandFolders) {
    const commandsPath = path.join(foldersPath, folder);
    if (folder.includes("example")) return; // ignore the example file

    const commandFiles = fs
        .readdirSync(commandsPath)
        .filter((file) => file.endsWith(".js"));
    for (const file of commandFiles) { 
        const filePath = path.join(commandsPath, file);
        const command = require(filePath); // we are now looking directly at the exported module
        if ("data" in command && "execute" in command) {
            commands.push(command.data.toJSON());
        } else {
            console.log(
                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
            );
        }
    }
}

const rest = new REST().setToken(token);

(async () => {
    try {
        console.log(
            `Started refreshing ${commands.length} application (/) commands.`
        );
        
        const data = await rest.put(Routes.applicationCommands(clientId), {
            body: commands,
        });
        console.log(
            `Successfully reloaded ${data.length} application (/) commands.`
        );
    } catch (error) {
        console.error(error);
    }
})();
