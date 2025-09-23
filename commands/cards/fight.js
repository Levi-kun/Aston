const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ComponentType,
	ActionRowBuilder,
	EmbedBuilder,
} = require("discord.js");

const { Battle, BattleStatus } = require("../../classes/battle.js");
const { OwnedCard } = require("../../classes/cardManager.js");

const { Query } = require("../../databases/query.js");
const pvpQuery = new Query("pvpBattles");
const ownedCardsQuery = new Query("ownedCards");
const loadoutQuery = new Query("defaultCardChoice");

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

function formatTime(ms) {
	const totalSeconds = Math.floor(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

async function fetchPlayerCards(userId) {
	const cards = await ownedCardsQuery.readMany({ owner_id: userId });
	return Promise.all(cards.map((card) => OwnedCard.buildsWithData(card)));
}

async function fetchPlayerLoadout(userId, loadoutName) {
	const loadout = await loadoutQuery.readOne({
		user_id: userId,
		loadoutType: loadoutName,
	});
	return loadout ? loadout.cardArray : [];
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
		)
		.addStringOption((option) =>
			option
				.setName("loadout")
				.setDescription(
					"If you have a saved loadout, specify it here to auto-choose your cards"
				)
				.setRequired(true)
		),
	async execute(interaction) {
		const guild = interaction.guild;
		const challenger = interaction.user;
		const challenged = interaction.options.getUser("opponent");
		const loadoutName = interaction.options.getString("loadout");

		const undesiredIntChecker = checkForUndesiredInteractions(
			interaction,
			challenger,
			challenged
		);
		let checker = await pvpQuery.readMany({
			guild_id: guild.id,
			challenger_id: challenger.id,
			challenged_id: challenged.id,
		});

		checker = grabMostRecentGame(checker);

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

		// Create a new battle instance
		const newBattle = new Battle();
		newBattle.guild_id = guild.id;
		newBattle.challenger_id = challenger.id;
		newBattle.challenged_id = challenged.id;
		newBattle.channel_id = interaction.channel.id;
		newBattle.status = BattleStatus.PENDING;
		newBattle.created_at = new Date();

		await newBattle.initMain();

		const tenMinutes = 10 * 60 * 1000; // 10 minutes in milliseconds
		const asOfChecking = new Date() - tenMinutes;

		// Start the selection process for both players
		const acceptEmbed = new EmbedBuilder()
			.setTitle("Battle Request")
			.setDescription(
				`Boss, ${challenger.username} wants to challenge you to a PvP battle. \nDo you accept?`
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

			if (i.customId === "deny_battle") {
				await newBattle.updateBattle("denied");
				await interaction.followUp("Boss, they denied the challenge.");
				return;
			}

			newBattle.initTelemetry(challenged.id);
			newBattle.initTelemetry(challenger.id);

			interaction.followUp({
				content: "Boss, the challenge was accepted. Let's get ready!",
			});

			// Fetch and assign cards to the challenger
			let challengerCards;
			if (loadoutName) {
				// Load challenger loadout
				const challengerLoadout = await fetchPlayerLoadout(
					challenger.id,
					loadoutName
				);
				challengerCards = await Promise.all(
					challengerLoadout.map((cardId) =>
						Card.buildsWithData({ _id: cardId })
					)
				);
			} else {
				// Fetch all cards if no loadout
				challengerCards = await fetchPlayerCards(challenger.id);
			}

			challengerCards = challengerCards.slice(0, 4);

			// Fetch and assign cards to the challenged player
			let challengedCards;
			if (loadoutName) {
				// Load challenged player loadout
				const challengedLoadout = await fetchPlayerLoadout(
					challenged.id,
					loadoutName
				);
				challengedCards = await Promise.all(
					challengedLoadout.map((cardId) =>
						OwnedCard.buildsWithData({ _id: cardId })
					)
				);
			} else {
				// Fetch all cards if no loadout
				challengedCards = await fetchPlayerCards(challenged.id);
			}

			challengedCards = challengedCards.slice(0, 4);

			// Add cards to battle
			challengerCards.forEach((card) => newBattle.addCard(card, true));
			challengedCards.forEach((card) => newBattle.addCard(card, false));

			await newBattle.updateBattle({
				cards: newBattle.cards.map((card) => card.toObject()),
			});
			await newBattle.updateBattle("ON_GOING");
			await newBattle.startBattle();

			collector.stop();
		});
	},
};
