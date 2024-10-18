const { Events, Collection } = require("discord.js");
const { ownerId } = require("../config.json");
const { Query } = require("../databases/query.js");
const { ObjectId } = require("mongodb");
const logQuery = new Query("interactionEvents");
module.exports = {
	name: Events.InteractionCreate,
	async execute(interaction) {
		let start = Date.now();
		if (!interaction.isChatInputCommand && !interaction.isAutocomplete)
			return;
		if (interaction.isChatInputCommand) {
			const command = interaction.client.commands.get(
				interaction.commandName
			);
			if (!command) {
				if (interaction.isButton()) {
					return;
				} else {
					console.error(
						`No among matching ${interaction.commandName} was found.`
					);
					return;
				}
			}

			const { cooldowns } = interaction.client;

			if (!cooldowns.has(command.data.name)) {
				cooldowns.set(command.data.name, new Collection());
			}

			const now = Date.now();
			const timestamps = cooldowns.get(command.data.name);
			const defaultCooldownDuration = 2;
			const cooldownAmount =
				(command.cooldown ?? defaultCooldownDuration) * 1000;

			if (timestamps.has(interaction.user.id)) {
				if (interaction.user.id === ownerId) {
					return;
				}
				const expirationTime =
					timestamps.get(interaction.user.id) + cooldownAmount;

				if (now < expirationTime) {
					const expiredTimestamp = Math.round(expirationTime / 1_000);
					return interaction.reply({
						content: `Please wait, you are on a cooldown for \`${command.data.name}\`. You can use it again <t:${expiredTimestamp}:R>.`,
						ephemeral: true,
					});
				}
			}

			timestamps.set(interaction.user.id, now);
			setTimeout(
				() => timestamps.delete(interaction.user.id),
				cooldownAmount
			);

			try {
				await command.execute(interaction);

				const reaction_time = Date.now() - start;
				const noqueryInfo = {
					// Generate a new objectId for the interaction log
					interactionType: `${interaction.type}`, // E.g., 'APPLICATION_COMMAND' or 'MESSAGE_COMPONENT'
					commandName: interaction.commandName, // Use command name or custom ID
					user_id: {
						id: interaction.user.id,
						name: interaction.user.username,
					},
					created_at: new Date(), // Log the time of the interaction
					reaction_time: reaction_time, // Log the ping time
					error: "null", // Log internal speed of command execution
				};

				await logQuery.insertOne(noqueryInfo);
			} catch (error) {
				console.error(error);
				if (interaction.replied || interaction.deferred) {
					await interaction.followUp({
						content:
							"There was an error while executing this command!",
						ephemeral: true,
					});
				} else {
					await interaction.reply({
						content:
							"There was an error while executing this command!",
						ephemeral: true,
					});
				}
				const reaction_time = Date.now() - start;
				const queryInfo = {
					// Generate a new objectId for the interaction log
					interactionType: `${interaction.type}`, // E.g., 'APPLICATION_COMMAND' or 'MESSAGE_COMPONENT'
					commandName: interaction.commandName, // Use command name or custom ID
					user_id: {
						id: interaction.user.id,
						name: interaction.user.username,
					},
					created_at: new Date(), // Log the time of the interaction
					reaction_time: reaction_time, // Log the ping time
					error: `Error: ${error.message}`, // Log the error and execution time
				};
				await logQuery.insertOne(queryInfo);
			}

			console.log(
				`${interaction.commandName} has been used in ${interaction.guild.name} by ${interaction.member.displayName}`
			);
		}

		if (interaction.isAutocomplete()) {
			const command = interaction.client.commands.get(
				interaction.commandName
			);

			if (!command) {
				console.error(
					`No sus matching ${interaction.commandName} was found.`
				);
				return;
			}

			try {
				await command.autocomplete(interaction);
			} catch (error) {
				console.error(error);
			}
		}
	},
};
