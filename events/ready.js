const { Events, ActivityType } = require("discord.js");
const clientF = require("../client.js");
const fs = require("fs");
const path = require("path");
const { collectSchemasAndCreateDB } = require(`../src/createCollections`);
const { monitorCollection } = require("../databases/expire.js");

module.exports = {
	name: Events.ClientReady,
	once: true,
	execute(client) {
		/*

        *

       DataBases

        *

        */

		collectSchemasAndCreateDB(path.resolve(__dirname, "../databases"));

		/*

        *

       Commands

        *

        */

		commands = clientF.commands;

		client.user.setStatus("online");
		client.user.setActivity("out, boss!", { type: ActivityType.Watching });

		const foldersPath = path.join(__dirname, "../commands");
		const commandFolders = fs.readdirSync(foldersPath);

		for (const folder of commandFolders) {
			// Grab all the command files from the commands directory you created earlier
			const commandsPath = path.join(foldersPath, folder);
			const commandFiles = fs
				.readdirSync(commandsPath)
				.filter((file) => file.endsWith(".js"));
			// Grab the SlashCommandBuilder#toJSON() output of each command's data for deployment
			for (const file of commandFiles) {
				const filePath = path.join(commandsPath, file);
				const command = require(filePath);
				if ("data" in command && "execute" in command) {
					commands.set(command.data.name, command);
					console.log(`${command.data.name}: Logged.`);
				} else {
					console.log(
						`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
					);
				}
			}
		}

		console.log("  ############");
		console.log(
			" ##############        #####          ####          ####     #####              ##############"
		);
		console.log(
			"######      #####      #########      ####          ####     #########         #################"
		);
		console.log(
			"#####        ####      ###########    ####          ####     ####  #####      ######        #####"
		);
		console.log(
			"#####        ####      ####  #####    ####          ####     ####  #####      ######          #####"
		);
		console.log(
			"#####        ####      ####   ####    ####          ####     ####  #####      ####          #######"
		);
		console.log(
			"#####        ####      ####   ####    ####          ####     ####  #####      ####################"
		);
		console.log(
			"#####        ####      ####   ####    ####          ####     ####  #####       ##################"
		);
		console.log(
			" ###############       ####   ####    ####          ####     ####  #####        ####### "
		);
		console.log(
			"  #############        ####   ####    ###########   ####     ####  #####         ###################"
		);
		console.log(
			"     ######            ####   ####    ###########   ####     ####  #####           ################"
		);
		console.log(`${client.user.tag} is logged in!`);
	},
};
