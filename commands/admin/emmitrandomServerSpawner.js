const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const eventEmitter = require("../../src/eventManager");

module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("emitrcs")
		.setDescription("Emits the randomCardSpawn event"),

	async execute(interaction) {
		if (interaction.user.id !== ownerId) return;

		// Emit the spawnInCard event
		eventEmitter.emit("spawnInCard", interaction.guild);

		await interaction.reply("randomServerSpawner event emitted!");
	},
};
