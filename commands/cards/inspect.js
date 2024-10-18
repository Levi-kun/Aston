const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
	ComponentType,
} = require("discord.js");
const { Query } = require("../../databases/query.js");

function rarityDesignater(rarity) {
	let value = "C";
	if (rarity <= 2) {
		value = "B";
	} else if (rarity <= 3) {
		value = "A";
	} else if (rarity <= 4) {
		value = "S";
	} else if (rarity <= 5) {
		value = "S+";
	}
	return value;
}

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
		const cardName = interaction.options.getString("name")?.toLowerCase(); // Optional chaining for safety
		const user = interaction.options.getUser("user") || interaction.user;

		const cardQuery = new Query("ownedCards");
		const photoQuery = new Query("animeCardPhotos");
		const animeQuery = new Query("animeCardList");
		try {
			if (!cardName) {
				// **1. Fetch All Cards Owned by the User**

				const findQuery = {
					player_id: user.id,
					guild_id: interaction.guild.id,
				};
				const userCards = await cardQuery.readMany(findQuery);

				if (!userCards || userCards.length === 0) {
					return interaction.reply({
						content: `${user.username} does not own any cards.`,
						ephemeral: true,
					});
				}

				// **2. Fetch All Photos for the User's Cards**
				const cardIds = userCards.map((card) => card.card_id);
				const pQuery = { card_id: { $in: cardIds } };
				const photos = await photoQuery.readMany(pQuery);
				if (!photos || photos.length === 0) {
					return interaction.reply({
						content: `No photos were found for the cards that ${user.username} has`,
						ephemeral: true,
					});
				}
				// **3. Assign Photos to Each Card**
				const cardPhotosMap = {};
				photos.forEach((photo) => {
					if (!cardPhotosMap[photo.cardId]) {
						cardPhotosMap[photo.cardId] = [];
					}
					cardPhotosMap[photo.cardId].push(photo.pictureData);
				});

				userCards.forEach((card) => {
					card.pictures = cardPhotosMap[card.card_id] || [];
				});

				let currentIndex = 0;

				// **4. Generate Embeds for Each Card Including Images**
				const generateEmbed = (card, index, total) => {
					const firstPhoto =
						card.pictures.length > 0
							? card.pictures[0]
							: "https://example.com/default-card-image.png"; // Replace with your default image URL
					return new EmbedBuilder()
						.setTitle(`Card: ${card.Name}`)
						.setDescription(
							`**ID:** ${
								card.card_id
							}\n**Rank:** ${rarityDesignater(
								card.rank
							)}\n**Power:** ${card.realPower}`
						)
						.setImage(firstPhoto) // Display the first photo
						.setFooter({ text: `Card ${index + 1} of ${total}` });
				};

				const embed = generateEmbed(
					userCards[currentIndex],
					currentIndex,
					userCards.length
				);

				// **5. Create Navigation Buttons**
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

				const inspectButton = new ButtonBuilder()
					.setCustomId("inspect")
					.setLabel("🔍")
					.setStyle(ButtonStyle.Success);

				const actionRow = new ActionRowBuilder().addComponents(
					leftButton,
					rightButton,
					inspectButton
				);

				// **6. Send Initial Embed with Buttons**
				const message = await interaction.reply({
					embeds: [embed],
					components: [actionRow],
					fetchReply: true,
				});

				// **7. Handle Button Interactions**
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
					} else if (i.customId === "inspect") {
						// **8. Inspect Card Without Photos**
						const card = userCards[currentIndex];
						const inspectEmbed = new EmbedBuilder()
							.setTitle(`Inspecting Card: ${card.Name}`)
							.setDescription(
								`**ID:** ${
									card.card_id
								}\n**Rarity:** ${rarityDesignater(
									card.rank
								)}\n**Power:** ${
									card.realPower
								}\n**Other Details...**`
							)
							.setFooter({
								text: `Inspected by ${interaction.user.username}`,
							});

						return i.reply({
							embeds: [inspectEmbed],
							ephemeral: true,
						});
					}

					// **9. Generate the New Embed with Updated Index**
					const newEmbed = generateEmbed(
						userCards[currentIndex],
						currentIndex,
						userCards.length
					);

					// **10. Update Button States**
					leftButton.setDisabled(currentIndex === 0);
					rightButton.setDisabled(
						currentIndex === userCards.length - 1
					);

					const newActionRow = new ActionRowBuilder().addComponents(
						leftButton,
						rightButton,
						inspectButton
					);

					// **11. Edit the Original Message with the New Embed and Updated Buttons**
					await i.update({
						embeds: [newEmbed],
						components: [newActionRow],
					});
				});

				collector.on("end", () => {
					// **12. Disable Buttons After Collector Ends**
					leftButton.setDisabled(true);
					rightButton.setDisabled(true);
					inspectButton.setDisabled(true);
					const disabledRow = new ActionRowBuilder().addComponents(
						leftButton,
						rightButton,
						inspectButton
					);
					message
						.edit({ components: [disabledRow] })
						.catch(console.error);
				});
			} else {
				// **13. Existing Card Inspection Logic with Photos (If Needed)**
				// If you want to handle inspecting a specific card by name, you can include the photo fetching here as well.
				// Below is an example implementation:

				// **a. Fetch the Card ID Based on the Card Name**
				const cQuery = {
					name: cardName,
				};

				const card = animeQuery.readMany(cQuery, { version: -1 }, 1);

				const pcQuery = {
					player_id: user.id,
					guild_id: interaction.guild.id,
					card_id: card[0]._id,
				};
				const rows = cardQuery.readMany(pcQuery, { version: -1 }, 1);

				if (!rows || rows.length === 0) {
					return interaction.reply({
						content: `${user.username} does not own any cards named "${cardName}".`,
						ephemeral: true,
					});
				}

				const cardIds = rows.map((card) => card.card_id);
				const pQuery = { card_id: { $in: cardIds } };
				const photos = await photoQuery.readMany(pQuery);
				if (!photos || photos.length === 0) {
					return interaction.reply({
						content: `No photos were found for the cards that ${user.username} has`,
						ephemeral: true,
					});
				}

				// **d. Prepare the Carousel Data**
				let currentIndex = 0; // Starting index for the carousel

				// **e. Generate Embeds with Images**
				const generateEmbedSpecific = (
					card,
					index,
					total,
					photoUrl
				) => {
					return new EmbedBuilder()
						.setTitle(`Card: ${cardName}`)
						.setDescription(
							`**ID:** ${card.id}\n**Rarity:** ${rarityDesignater(
								card.rank
							)}\n**Power:** ${card.realPower}`
						)
						.setImage(
							photoUrl ||
								"https://example.com/default-card-image.png"
						) // Replace with your default image URL
						.setFooter({ text: `Card ${index + 1} of ${total}` });
				};

				const embed = generateEmbedSpecific(
					rows[currentIndex],
					currentIndex,
					rows.length,
					photos[0].attachment
				);

				// **f. Create Navigation Buttons**
				const leftButton = new ButtonBuilder()
					.setCustomId("left")
					.setLabel("◀️")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(true); // Initially disabled since we're at the first card

				const rightButton = new ButtonBuilder()
					.setCustomId("right")
					.setLabel("▶️")
					.setStyle(ButtonStyle.Primary)
					.setDisabled(rows.length === 1); // Disabled if only one card

				const actionRow = new ActionRowBuilder().addComponents(
					leftButton,
					rightButton
				);

				// **g. Send the Initial Message with Embed and Buttons**
				const message = await interaction.reply({
					embeds: [embed],
					components: [actionRow],
					fetchReply: true,
				});

				// **h. Create a Collector to Handle Button Interactions**
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

					// **i. Update the Current Index Based on Button Clicked**
					if (i.customId === "left") {
						currentIndex =
							currentIndex > 0 ? currentIndex - 1 : currentIndex;
					} else if (i.customId === "right") {
						currentIndex =
							currentIndex < rows.length - 1
								? currentIndex + 1
								: currentIndex;
					}

					// **j. Generate the New Embed**
					const newEmbed = generateEmbedSpecific(
						rows[currentIndex],
						currentIndex,
						rows.length,
						photos[currentIndex].attachment ||
							"https://example.com/default-card-image.png"
					);

					// **k. Update Button States**
					leftButton.setDisabled(currentIndex === 0);
					rightButton.setDisabled(currentIndex === rows.length - 1);
					const newActionRow = new ActionRowBuilder().addComponents(
						leftButton,
						rightButton
					);

					// **l. Edit the Original Message with the New Embed and Updated Buttons**
					await i.update({
						embeds: [newEmbed],
						components: [newActionRow],
					});
				});

				collector.on("end", () => {
					// **m. Disable Buttons After Collector Ends**
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
