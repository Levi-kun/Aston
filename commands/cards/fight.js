const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ActionRowBuilder,
	EmbedBuilder,
} = require("discord.js");

// Import Battle class from the classes folder to create a new battle instance.
const { Battle, BattleStatus } = require("../../classes/battle.js");

const { Query } = require("../../databases/query.js");
const pvpQuery = new Query("pvpBattles");

function checkForUndesiredInteractions(interaction, challenger, challenged) {
	if (!challenged) {
		return 0;
	}

	if (challenged.bot) {
		return 1;
	}

	if (challenger.id === challenged.id) {
		return 2;
	}
}

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
		const guild = interaction.guild;
		const challenger = interaction.user;
		const challenged = interaction.options.getUser("opponent");

		const undesiredIntChecker = checkForUndesiredInteractions(
			interaction,
			challenger,
			challenged
		);

		if (undesiredIntChecker == 0) {
			return interaction.reply(
				"Please provide a valid user as an opponent."
			);
		} else if (undesiredIntChecker == 1) {
			return interaction.reply(
				"Boss, you can't just challenge one of those robos."
			);
		} else if (undesiredIntChecker == 2) {
			return interaction.reply("Boss, you can't challenge yourself.");
		}

		const data = {
			guild_id: guild.id,
			challenger_id: challenger.id,
			challenged_id: challenged.id,
			channel_id: interaction.channel.id,
			status: BattleStatus.PENDING,
			created_at: new Date(),
		};

		const newBattle = Battle.createNew(data);

		const checker = await pvpQuery.checkOne(
			newBattle.grabAllProperties(true)
		);
		console.log(checker);
		if (checker) {
			return interaction.reply(
				"Boss, you've already challenged this user. Please wait for their response."
			);
		}

		newBattle.synchronizeWithDB();

		try {
			const acceptEmbed = new EmbedBuilder()
				.setTitle("Battle Request")
				.setDescription(
					`Boss, ${challenger.username} wants to challenge you to a PvP battle. \nDo you accept? `
				)
				.setFooter({
					text: `Request sent by ${challenger.username} @ ${interaction.guild.name}`,
				});

			const buttonRow = new ActionRowBuilder().addComponents(
				new ButtonBuilder()
					.setCustomId("accept_battle")
					.setEmoji("✔️")
					.setStyle(ButtonStyle.Secondary),
				new ButtonBuilder()
					.setCustomId("deny_battle")
					.setEmoji("❌")
					.setStyle(ButtonStyle.Secondary)
			);
			try {
				const message = await challenged.send({
					embeds: [acceptEmbed],
					components: [buttonRow],
					fetchReply: true,
				});
			} catch (error) {
				return interaction.reply({
					content: "Failed to send message to user in DMs.",
					ephemeral: true,
				});
			}
			const battle = await Battle.createBattle(
				guild.id,
				challenger.id,
				challenged.id,
				"start"
			);
			interaction.reply({
				content: "Hand shake recieved...",
				ephemeral: true,
			});
			const collector = message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300000, // 5 minutes
			});

			collector.on("collect", async (i) => {
				if (i.user.id !== challenged.id) {
					throw Error(
						"Lebron James! WTF!? (someone else clicked the button in a dm...)"
					);
				}

				if (i.customId === "accept_battle") {
					await interaction.followUp(
						"Boss, they accepted the challenge."
					);
					await battle.startBattle();
				} else if (i.customId === "deny_battle") {
					await battle.cancelBattle();
					await interaction.followUp({
						content: "Boss, they denied the challenge.",
						ephemeral: true,
					});

					i.reply({ content: "Good choice...", ephemeral: true });
					return;
				}

				collector.stop();

				i.reply({ content: "Good luck. Boss.", ephemeral: true });
			});

			collector.on("end", (i, reason) => {
				console.log(battle);
				if (reason === "time") {
					challenged.send({
						content: `"I'll be back." \n- Note from ${interaction.user.username}`, // Changed 'name' to 'username'
						ephemeral: true,
					});
					battle.cancelBattle();
				}
				i.delete();
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
