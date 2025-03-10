// Import necessary modules and classes
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
const { ObjectId } = require("mongodb");

module.exports = {
	category: "cards",
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName("inspect")
		.setDMPermission(false)
		.setDescription("Boss let me inspect this card real quick for you.")
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
		const animeCardListQuery = new Query("animeCardList");
		const photoQuery = new Query("animeCardPhotos");

		await interaction.deferReply();

		if (cardName) {
			const parentCard = await animeCardListQuery.readOne({
				name: cardName,
			});

			if (!parentCard) {
				return await interaction.reply({
					content: `No card found with the name "${cardName}"`,
					ephemeral: true,
				});
			}

			const photos = await photoQuery.readMany({
				card_id: new ObjectId(parentCard._id),
			});

			const image = photos.length > 0 ? photos[0].attachment : null;

			const embed = new EmbedBuilder()
				.setTitle(`Card: ${parentCard.name}`)
				.setDescription(
					`**Power:** ${parentCard.power}\n` +
						`**Categories:** ${parentCard.categories.join(
							", "
						)}\n` +
						`**Rarity:** ${parentCard.rarity}\n` +
						`**Version:** ${parentCard.version}`
				)
				.setImage("https://example.com/default-card-image.png");

			if (image) {
				embed.setImage(image);
			}
			return await interaction.reply({ embeds: [embed] });
		}

		const userCards = await ownedCardsQuery.aggregate({
			player_id: user.id,
			guild_id: interaction.guild.id,
		});

		if (!userCards || userCards.length === 0) {
			return await interaction.reply({
				content: `${user.username} does not own any cards.`,
				ephemeral: true,
			});
		}

		let currentIndex = 0;

		const generateEmbed = async (card, index, total) => {
			// Wait for the result of the async readMany call
			const photos = await photoQuery.readMany({
				card_id: new ObjectId(card._id),
			});

			// Process photos
			const image = photos.length > 0 ? photos[0].attachment : null;

			const raritySymbol = card.getRarity();

			const embed = new EmbedBuilder()
				.setTitle(`Card: ${card.name}`)
				.setDescription(
					`**ID:** ${card.card_id}\n` +
						`**Rank:** ${raritySymbol}\n` +
						`**Power:** ${card.realPower}`
				)
				.setFooter({ text: `Card ${index + 1} of ${total}` })
				.setTimestamp();

			// If image was found, set it
			if (image) {
				embed.setImage(image);
			}

			return embed;
		};

		const ownedCardObject = new OwnedCard().buildsWithData(
			userCards[currentIndex].lv
		);
		const embed = await generateEmbed(
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

		const initialMessage = await interaction.followUp({
			embeds: [embed],
			components: [actionRow],
			withResponse: true,
		});

		const collector = interaction.channel.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 60000,
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
			const newEmbed = await generateEmbed(
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

			await initialMessage
				.edit({ components: [disabledRow] })
				.catch(console.error);
		});
	},
};
