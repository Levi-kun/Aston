const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("testguildcreate")
		.setDescription("Emits the GuildCreate event"),
	async execute(interaction) {
		if (!interaction.user.id === ownerId) return;
		// Emit the GuildCreate event
		interaction.client.emit("guildCreate", interaction.guild);

		await interaction.reply("GuildCreate event emitted!");
	},
};
