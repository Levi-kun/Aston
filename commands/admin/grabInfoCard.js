const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const { Card } = require("../../classes/cardManager.js");

const { Query } = require("../../databases/query.js"); // Path to your Query class

const collectionName = "animeCardList"; // Replace with your actual collection name

module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("cardinfo")
		.setDescription("Retrieve data and moves for a specific anime card")
		.addStringOption((option) =>
			option
				.setName("cardname")
				.setDescription(
					"Enter the name of the card you want to retrieve data for"
				)
				.setRequired(true)
		),
	async execute(interaction) {
		if (interaction.user.id !== ownerId) return;

		// Get option value from the interaction
		const cardName = interaction.options.getString("cardname");
		const query = new Query(collectionName); // Instantiate the Query class

		try {
			// Retrieve data for the specified card name
			const cardData = await query.readOne({ name: cardName });
			if (Object.keys(cardData).length === 0) {
				await interaction.reply(
					`No data found for card "${cardName}".`
				);
				return;
			}

			// Assuming you want to display the data in a formatted way
			const formattedData = `ID: ${cardData._id}, Name: ${
				cardData.name
			}, Power: ${cardData.power}, Categories: ${cardData.categories.join(
				", "
			)}, Owned: ${cardData.owned}, Rarity: ${
				cardData.rarity
			}, Version: ${cardData.version}`;

			// Retrieve moves associated with the card
			const moveQuery = new Query("animeCardMoves"); // Collection for moves
			const moves = await moveQuery.readOne({ cardId: cardData._id });
			let formatedMoves;

			if (Object.keys(moves).length == 0) {
				formatedMoves = 0;
			} else {
				formattedMoves = moves.map((move) => {
					return `Move: ${move.moveName}, Description: ${move.moveDescription}, Type: ${move.moveType}, Base DMG: ${move.baseDMG}`;
				});
			}
			// Retrieve associated photos
			const photoQuery = new Query("animeCardPhotos"); // Collection for photos
			const photos = await photoQuery.readOne({ card_id: cardData._id });
			let photoUrls;
			if (Object.keys(photos).length == 0) {
				photoUrls = 0;
			} else {
				photoUrls = photos.map((photo) => photo.pictureData);
			}
			await interaction.reply(
				`Data for card "${cardName}":\n${formattedData}\nMoves:\n${formattedMoves.join(
					"\n"
				)}\nPhotos:\n${photoUrls.join("\n")}`
			);
		} catch (error) {
			console.error("Error retrieving card data:", error.message);
			await interaction.reply(
				"An error occurred while retrieving card data."
			);
		}
	},
};
