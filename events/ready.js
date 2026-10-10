const { Events, ActivityType } = require("discord.js");
const clientF = require("../client.js");
const fs = require("fs");
const path = require("path");
const { createAtStartTables } = require(`../src/createDatabases.js`)

/**
 * 
 *      This is the ready.js file, that handles the ready event
 *      The ready event happens once, and at the start of the bot's runtime
 * 
 */

module.exports = {
        name: Events.ClientReady,
        once: true,
        async execute(client) {

        /*
                Create DBs
        */
               
                await createAtStartTables();

        /*

        *

                Hooks into Commands

        *

        */

                commands = clientF.commands;

                client.user.setStatus("online");
                client.user.setActivity("out, boss!", { type: ActivityType.Watching });

                const foldersPath = path.join(__dirname, "../commands");
                const commandFolders = fs.readdirSync(foldersPath);

                /** For loop for hooking into the commands in the command folder expects commands to be placed in a <category folder>/<commandName>.js */
                for (const folder of commandFolders) {
                        const commandsPath = path.join(foldersPath, folder);
                        const commandFiles = fs
                                .readdirSync(commandsPath)
                                .filter((file) => file.endsWith(".js"));
                        for (const file of commandFiles) {
                                const filePath = path.join(commandsPath, file);
                                const command = require(filePath);
                                if ("data" in command && "execute" in command) {
                                        commands.set(command.data.name, command);
                                        console.log(`${command.data.name}: Logged.`);
                                } else {
                                        console.log(
                                                `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`,
                                        );
                                }
                        }
                }
                
                console.log("  ############");
                console.log(
                        " ##############        #####          ####          ####     #####              ##############",
                );
                console.log(
                        "######      #####      #########      ####          ####     #########         #################",
                );
                console.log(
                        "#####        ####      ###########    ####          ####     ####  #####      ######        #####",
                );
                console.log(
                        "#####        ####      ####  #####    ####          ####     ####  #####      ######          #####",
                );
                console.log(
                        "#####        ####      ####   ####    ####          ####     ####  #####      ####          #######",
                );
                console.log(
                        "#####        ####      ####   ####    ####          ####     ####  #####      ####################",
                );
                console.log(
                        "#####        ####      ####   ####    ####          ####     ####  #####       ##################",
                );
                console.log(
                        " ###############       ####   ####    ####          ####     ####  #####        ####### ",
                );
                console.log(
                        "  #############        ####   ####    ###########   ####     ####  #####         ###################",
                );
                console.log(
                        "     ######            ####   ####    ###########   ####     ####  #####           ################",
                );
                console.log(`${client.user.tag} is logged in!`);
        },
};
