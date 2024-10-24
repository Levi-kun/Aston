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

		const ownedCardsQuery = new Query("ownedCards")

		try {
			if (!cardName) {
				// **1. Fetch All Cards Owned by the User Using Card Class**
				const userCards = await ownedCardsQuery.aggregate({ user_id: user.id });

				if (!userCards || userCards.length === 0) {
					return interaction.reply({
						content: `${user.username} does not own any cards.`,
						ephemeral: true,
					});
				}

				let currentIndex = 0;

				// **2. Generate Embeds for Each Card Including Images**
				const generateEmbed = (card, index, total) => {
					const firstPhoto =
						card.pictures && card.pictures.length > 0
							? card.pictures[0]
							: "https://example.com/default-card-image.png"; // Replace with your default image URL

					return new EmbedBuilder()
						.setTitle(`Card: ${card.name}`)
						.setDescription(
							`**ID:** ${
								card.card_id
							}\n**Rank:** ${card.getRarity()}\n**Power:** ${
								card.realPower
							}`
						)
						.setImage(firstPhoto) // Display the first photo
						.setFooter({ text: `Card ${index + 1} of ${total}` });
				};

				const embed = generateEmbed(
					userCards[currentIndex],
					currentIndex,
					userCards.length
				);

				// **3. Create Navigation Buttons**
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

				// **4. Send Initial Embed with Buttons**
				const message = await interaction.reply({
					embeds: [embed],
					components: [actionRow],
					fetchReply: true,
				});

				// **5. Handle Button Interactions**
				const collector = message.createMessageComponentCollector({
					componentType: ComponentType.Button,
					time: 600000, // 10 minutes
				});

				collector.on("collect", async (i) => {
					if (i.user.id !== interaction.user.id) {
						return i.reply({
							content: "You cannot interact with these buttons.",
							ephemeral: true,
						});
					}

					if (i.customId === "left") {
						currentIndex =
							currentIndex > 0 ? currentIndex - 1 : currentIndex;
					} else if (i.customId === "right") {
						currentIndex =
							currentIndex < userCards.length - 1
								? currentIndex + 1
								: currentIndex;
					}

					// **6. Generate the New Embed with Updated Index**
					const newEmbed = generateEmbed(
						userCards[currentIndex],
						currentIndex,
						userCards.length
					);

					// **7. Update Button States**
					leftButton.setDisabled(currentIndex === 0);
					rightButton.setDisabled(
						currentIndex === userCards.length - 1
					);

					const newActionRow = new ActionRowBuilder().addComponents(
						leftButton,
						rightButton
					);

					// **8. Edit the Original Message with the New Embed and Updated Buttons**
					await i.update({
						embeds: [newEmbed],
						components: [newActionRow],
					});
				});

				collector.on("end", () => {
					// **9. Disable Buttons After Collector Ends**
					leftButton.setDisabled(true);
					rightButton.setDisabled(true);
					const disabledRow = new ActionRowBuilder().addComponents(
						leftButton,
						rightButton
					);
					message
						.edit({ components: [disabledRow] })
						.catch(console.error);
				});
			} else {
				// **10. Existing Card Inspection Logic with Specific Card Name**

				const card = user ? await ownedCardsQuery.findOne({ user_id: user.id, name: cardName  }) : await Card.getCardByParam({ name: cardName });
				
				if (!card) {
					return interaction.reply({
						content: `${user.username} does not own any cards named "${cardName}".`,
						ephemeral: true,
					});
				}

				const embed = new EmbedBuilder()
					.setTitle(`Card: ${card.name}`)
					.setDescription(
						`**ID:** ${card.card_id}\n**Rank:** ${rarityDesignater(
							card.rank
						)}\n**Power:** ${card.realPower}`
					)
					.setImage(card.grabPhotosForCard());

				await interaction.reply({ embeds: [embed], ephemeral: true });
			}
		} catch (e) {
			console.error(e);
			return interaction.reply({
				content: "An error occurred while trying to inspect the card.",
				ephemeral: true,
			});
		}
	},
};
