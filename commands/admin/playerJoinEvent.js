const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");

module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("playermoveevents")
		.setDescription("Emits the GuildCreate event")
		.addStringOption((option) =>
			option
				.setName("joinorleave")
				.setDescription("You want to test Joining or Leaving boss?")
				.setRequired(true)
				.addChoices(
					{ name: "Join", value: "Join" },
					{
						name: "Leave",
						value: `Leave`,
					}
				)
		),
	async execute(interaction) {
		try {
			const inOurOut = interaction.options.getString("joinorleave");
			if (interaction.user.id !== ownerId) return;

			// Emit the appropriate event
			if (inOurOut === "Join") {
				interaction.client.emit("guildMemberAdd", interaction.member);
			} else if (inOurOut === "Leave") {
				interaction.client.emit(
					"guildMemberRemove",
					interaction.member
				);
			}

			await interaction.reply(`${interaction.user.username} has moved!`);
		} catch (e) {
			console.log(e);
		}
	},
};
