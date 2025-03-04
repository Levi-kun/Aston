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
const { Card } = require("../../classes/cardManager.js");

const { Query } = require("../../databases/query.js");
const pvpQuery = new Query("pvpBattles");
const ownedCardsQuery = new Query("ownedCards");

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

function grabMostRecentGame(array) {
	let mostRecent = null;
	for (const game of array) {
		if (mostRecent === null || game.created_at > mostRecent.created_at) {
			mostRecent = game;
		}
	}
	return mostRecent;
}

function formatTime(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function fetchPlayerCards(userId) {
	const cards = await ownedCardsQuery.readMany({ owner_id: userId });
	return Promise.all(cards.map((card) => Card.createFromData(card)));
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

		// Create a new battle instance
		const newBattle = new Battle();
		newBattle.guild_id = guild.id;
		newBattle.challenger_id = challenger.id;
		newBattle.challenged_id = challenged.id;
		newBattle.channel_id = interaction.channel.id;
		newBattle.status = BattleStatus.PENDING;
		newBattle.created_at = new Date();

		await newBattle.createBattle();

		let checker = await pvpQuery.readMany({
			guild_id: guild.id,
			challenger_id: challenger.id,
			challenged_id: challenged.id,
		});

		checker = grabMostRecentGame(checker);

		const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
		const asOfChecking = new Date() - tenMinutes;

		if (checker && checker.status === BattleStatus.PENDING) {
			return interaction.reply(
				"Boss, you've already challenged this user. Please wait for their response."
			);
		} else if (
			checker &&
			checker.status === BattleStatus.DENIED &&
			new Date(checker.created_at) < asOfChecking
		) {
			const timeLeft = formatTime(
				asOfChecking - new Date(checker.created_at)
			);
			return interaction.reply(
				`Boss, you gotta wait. I know. but we got ${timeLeft} left.`
			);
		}

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
					.setStyle(ButtonStyle.Success),
				new ButtonBuilder()
					.setCustomId("deny_battle")
					.setEmoji("❌")
					.setStyle(ButtonStyle.Danger)
			);

			const message = await challenged.send({
				embeds: [acceptEmbed],
				components: [buttonRow],
				fetchReply: true,
			});

			interaction.reply({
				content: "Handshake received...",
				ephemeral: true,
			});

			const collector = message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 300000, // 5 minutes
			});

			collector.on("collect", async (i) => {
				if (i.user.id !== challenged.id) return;

				if (i.customId === "accept_battle") {
					await interaction.followUp(
						"Boss, they accepted the challenge."
					);

					// Fetch and assign cards to both players
					const challengerCards = await fetchPlayerCards(
						challenger.id
					);
					const challengedCards = await fetchPlayerCards(
						challenged.id
					);

					challengerCards.forEach((card) =>
						newBattle.addCard(card, true)
					);
					challengedCards.forEach((card) =>
						newBattle.addCard(card, false)
					);

					await newBattle.updateBattle({
						cards: newBattle.cards.map((card) => card.toObject()),
					});

					await newBattle.startBattle();
				} else if (i.customId === "deny_battle") {
					await newBattle.forfeit(challenged.id);
					await interaction.followUp(
						"Boss, they denied the challenge."
					);
				}

				collector.stop();
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
