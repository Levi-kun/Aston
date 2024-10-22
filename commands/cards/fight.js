const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
} = require("discord.js");

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
		// Import Battle class from the classes folder to create a new battle instance.
		const { Battle } = require("../../classes/battle.js");

		const challenger = interaction.user;
		const challenged = interaction.options.getUser("opponent");

		if (!challenged) {
			return interaction.reply(
				"Please provide a valid user as an opponent."
			);
		}

		if (challenger.id === challenged.id)
			return interaction.reply("Boss, you can't challenge yourself.");

		const guild = interaction.guild;
		try {
			const battle = await Battle.createBattle(
				guild.id,
				challenger.id,
				challenged.id
			);

			const acceptEmbed = new EmbedBuilder()
				.setTitle("Battle Request")
				.setDescription(
					`Boss, ${challenger.username} wants to challenge you to a PvP battle. \nDo you accept? Click on the button below to confirm.`
				)
				.setFooter(
					`Request sent by ${challenger.username} @ ${interaction.guild.name}`
				);

			const buttonRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("accept_battle")
					.setEmoji("✔️")
					.setStyle(ButtonStyle.PRIMARY),
				new ButtonBuilder()
					.setCustomId("deny_battle")
					.setEmoji("❌")
					.setStyle(ButtonStyle.DANGER)
			);

			challenged.send({
				embeds: [acceptEmbed],
				components: [buttonRow],
				fetchReply: true,
			});

			const collector = challenged.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300000, // 5 minutes
			});

			collector.on("collect", async (i) => {
				if (i.user.id === challenged.id) {
					throw Error(
						"Lebron James! WTF!? (someone else clicked the button in a dm...)"
					);
				}

				if (i.customId === "accept_battle") {
					await battle.startBattle();
				} else if (i.customId === "deny_battle") {
					await battle.cancelBattle();
					await interaction.reply("Boss, they denied the challenge.");
					return;
				}
			});
		} catch (error) {
			console.error("Error starting battle:", error);
			await interaction.reply({
				content: "Error starting battle. Please try again later.",
				ephemeral: true,
			});
		}
	},
};
