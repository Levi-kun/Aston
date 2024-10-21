const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
} = require("discord.js");
const { Battle, BattleStatus } = require("../../classes/battle.js");
const { Card } = require("../../classes/cardManager.js");
const { Query } = require("../../databases/query.js"); // Path to your Query class

const requiredCards = 4;
const pvpBattleCollectionName = "pvpBattles"; // Your pvpBattles collection name

module.exports = {
	category: "cards",
	data: new SlashCommandBuilder()
		.setName("challenge")
		.setDescription(
			"Boss, you're gonna challenge another user to a PvP battle? Good Luck."
		)
		.addUserOption((option) =>
			option
				.setName("opponent")
				.setDescription(
					"Select the unfortunate opponent you want to challenge"
				)
				.setRequired(true)
		),
	async execute(interaction) { 
		const challenger = interaction.user;
		const challenged = interaction.options.getUser("opponent");

		if(!challenged) {
			return interaction.reply("Please provide a valid user as an opponent.");
		}

		if(challenger.id === challenged.id) return interaction.reply("Boss, you can't challenge yourself.");

		const guild = interaction.guild;
		const battle = battle.createBattle(guild.id, challenger.id, challenged.id);
		

	} }