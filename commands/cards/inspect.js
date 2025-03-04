const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
	ComponentType,
} = require("discord.js");
const { OwnedCard, Card } = require("../../classes/cardManager.js");
const { Query } = require("../../databases/query.js");

module.exports = {
	category: "cards",
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName("inspect")
		.setDMPermission(false)
		.setDescription("Inspects a card!")
		.addStringOption((option) =>
			option.setName("name").setDescription("What's the card name?")
		)
		.addUserOption((option) =>
			option
				.setName("user")
				.setDescription("Which user do you want to use?")
		),
	async execute(interaction) {
		const cardName = interaction.options.getString("name")?.toLowerCase();
		const user = interaction.options.getUser("user") || interaction.user;
		const ownedCardsQuery = new Query("ownedCards");

		if (!cardName) {
			const userCards = await ownedCardsQuery.aggregate({
				player_id: user.id,
			});

			if (!userCards || userCards.length === 0) {
				return await interaction.reply({
					content: `${user.username} does not own any cards.`,
					ephemeral: true,
				});
			}

			let currentIndex = 0;

			const generateEmbed = (card, index, total) => {
				const firstPhoto =
					card._photoUrls && card._photoUrls.length > 0
						? card._photoUrls
						: "https://example.com/default-card-image.png";
				return new EmbedBuilder()
					.setTitle(`Card: ${card.name}`)
					.setDescription(
						`**ID:** ${card.card_id}\n**Rank:** ${card.rank}\n**Power:** ${card.realPower}`
					)
					.setImage(firstPhoto)
					.setFooter({ text: `Card ${index + 1} of ${total}` });
			};

			const ownedCardObject = new OwnedCard().buildsWithData(
				userCards[currentIndex].lv
			);
			const embed = generateEmbed(
				ownedCardObject,
				currentIndex,
				userCards.length
			);

			const leftButton = new ButtonBuilder()
				.setCustomId("left")
				.setLabel("◀️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(true);

			const rightButton = new ButtonBuilder()
				.setCustomId("right")
				.setLabel("▶️")
				.setStyle(ButtonStyle.Primary)
				.setDisabled(userCards.length === 1);

			const actionRow = new ActionRowBuilder().addComponents(
				leftButton,
				rightButton
			);

			const initialMessage = await interaction.reply({
				embeds: [embed],
				components: [actionRow],
				withResponse: true,
			});

			const message =
				initialMessage.resource?.message ||
				(await interaction.fetchReply());

			const collector = message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 600000,
			});

			collector.on("collect", async (i) => {
				if (i.user.id !== interaction.user.id) {
					return i.reply({
						content: "You cannot interact with these buttons.",
						ephemeral: true,
					});
				}

				if (i.customId === "left" && currentIndex > 0) {
					currentIndex--;
				} else if (
					i.customId === "right" &&
					currentIndex < userCards.length - 1
				) {
					currentIndex++;
				}

				const newOwnedCardObject = new OwnedCard().buildsWithData(
					userCards[currentIndex].lv
				);
				const newEmbed = generateEmbed(
					newOwnedCardObject,
					currentIndex,
					userCards.length
				);

				leftButton.setDisabled(currentIndex === 0);
				rightButton.setDisabled(currentIndex === userCards.length - 1);

				const newActionRow = new ActionRowBuilder().addComponents(
					leftButton,
					rightButton
				);

				await i.update({
					embeds: [newEmbed],
					components: [newActionRow],
				});
			});

			collector.on("end", async () => {
				leftButton.setDisabled(true);
				rightButton.setDisabled(true);
				const disabledRow = new ActionRowBuilder().addComponents(
					leftButton,
					rightButton
				);
				await message
					.edit({ components: [disabledRow] })
					.catch(console.error);
			});
		}
	},
};
