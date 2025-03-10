const {
	SlashCommandBuilder,
	ButtonBuilder,
	ButtonStyle,
	ActionRowBuilder,
	EmbedBuilder,
	ComponentType,
} = require("discord.js");
const { Query } = require("../../databases/query.js");
const { ObjectId } = require("mongodb");

module.exports = {
	category: "cards",
	cooldown: 10,
	data: new SlashCommandBuilder()
		.setName("loadoutcreate")
		.setDescription(
			"Boss create a loadout for ease and comfort gotcha you know"
		)
		.addStringOption((option) =>
			option
				.setName("loadout_name")
				.setDescription("What do you want to call your loadout?")
		),
	async execute(interaction) {
		const loadoutName = interaction.options.getString("loadout_name");
		const user = interaction.user;
		const guildId = interaction.guild.id;
		const cardQuery = new Query("ownedCards");
		const loadoutQuery = new Query("defaultCardChoice");

		// Fetch the list of available cards
		const cards = await cardQuery.readMany({
			guild_id: interaction.guild.id,
			player_id: interaction.user.id,
		});
		if (cards.length <= 4) {
			return interaction.reply({
				content: "No cards are available at the moment.",
				ephemeral: true,
			});
		}

		let currentIndex = 0;
		let selectedCards = [];

		const generateEmbed = (index, total) => {
			const card = cards[index];
			return new EmbedBuilder()
				.setTitle(`Choose Card: ${card.name}`)
				.setDescription(`Use the buttons to select/deselect this card.`)
				.setFooter({ text: `Card ${index + 1} of ${total}` })
				.setImage(
					card.imageUrl ||
						"https://example.com/default-card-image.png"
				);
		};

		const leftButton = new ButtonBuilder()
			.setCustomId("left")
			.setLabel("◀️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(true);

		const rightButton = new ButtonBuilder()
			.setCustomId("right")
			.setLabel("▶️")
			.setStyle(ButtonStyle.Primary)
			.setDisabled(cards.length === 1);

		const selectButton = new ButtonBuilder()
			.setCustomId("select")
			.setLabel("Select")
			.setStyle(ButtonStyle.Success);

		const confirmButton = new ButtonBuilder()
			.setCustomId("confirm")
			.setLabel("Confirm Loadout")
			.setStyle(ButtonStyle.Danger)
			.setDisabled(true); // Initially disabled

		const actionRow = new ActionRowBuilder().addComponents(
			leftButton,
			rightButton,
			selectButton,
			confirmButton
		);

		const initialMessage = await interaction.reply({
			embeds: [generateEmbed(currentIndex, cards.length)],
			components: [actionRow],
			fetchReply: true,
		});

		const collector = interaction.channel.createMessageComponentCollector({
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
				currentIndex < cards.length - 1
			) {
				currentIndex++;
			}

			if (i.customId === "select") {
				const selectedCardId = cards[currentIndex]._id.toString();
				if (selectedCards.includes(selectedCardId)) {
					selectedCards = selectedCards.filter(
						(cardId) => cardId !== selectedCardId
					);
					selectButton.setLabel("Select");
				} else if (selectedCards.length < 4) {
					selectedCards.push(selectedCardId);
					selectButton.setLabel("Deselect");
				}
			}

			if (selectedCards.length === 4) {
				selectedButton.setDisabled(true);
				confirmButton.setDisabled(false); // Enable the confirm button once 4 cards are selected
			} else {
				confirmButton.setDisabled(true); // Disable it otherwise
			}

			leftButton.setDisabled(currentIndex === 0);
			rightButton.setDisabled(currentIndex === cards.length - 1);

			const newEmbed = generateEmbed(currentIndex, cards.length);
			await i.update({
				embeds: [newEmbed],
				components: [
					new ActionRowBuilder().addComponents(
						leftButton,
						rightButton,
						selectButton,
						confirmButton
					),
				],
			});
		});

		collector.on("end", async () => {
			if (selectedCards.length > 0 && loadoutName) {
				// Save the loadout to the database
				const existingLoadout = await loadoutQuery.readOne({
					user_id: user.id,
					guild_id: guildId,
					loadoutType: loadoutName,
				});

				if (existingLoadout) {
					await loadoutQuery.updateOne(
						{ _id: existingLoadout._id },
						{ $set: { cardArray: selectedCards } }
					);
					return interaction.followUp({
						content: `Your loadout "${loadoutName}" has been updated.`,
					});
				} else {
					await loadoutQuery.create({
						user_id: user.id,
						guild_id: guildId,
						cardArray: selectedCards,
						loadoutType: loadoutName,
					});
					return interaction.followUp({
						content: `Your new loadout "${loadoutName}" has been saved.`,
					});
				}
			} else {
				return interaction.followUp({
					content: "No cards selected. Loadout creation canceled.",
				});
			}
		});

		// Handle the Confirm button
		collector.on("collect", async (i) => {
			if (i.customId === "confirm") {
				if (selectedCards.length === 4) {
					// Finalize and save the loadout
					if (loadoutName) {
						// Save the loadout to the database
						const existingLoadout = await loadoutQuery.readOne({
							user_id: user.id,
							guild_id: guildId,
							loadoutType: loadoutName,
						});

						if (existingLoadout) {
							await loadoutQuery.updateOne(
								{ _id: existingLoadout._id },
								{ $set: { cardArray: selectedCards } }
							);
							return i.reply({
								content: `Your loadout "${loadoutName}" has been updated and finalized.`,
							});
						} else {
							await loadoutQuery.create({
								user_id: user.id,
								guild_id: guildId,
								cardArray: selectedCards,
								loadoutType: loadoutName,
							});
							return i.reply({
								content: `Your new loadout "${loadoutName}" has been saved and finalized.`,
							});
						}
					}
				} else {
					return i.reply({
						content:
							"You need to select 4 cards before confirming.",
						ephemeral: true,
					});
				}
			}
		});
	},
};
