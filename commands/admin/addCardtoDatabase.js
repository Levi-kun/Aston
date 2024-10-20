const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const { Query } = require("../../databases/query.js");

const collectionName = "animeCardList";

module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("createcard")
		.setDescription("Create or update an anime card")
		.addStringOption((option) =>
			option
				.setName("cardname")
				.setDescription("Enter the card's name")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("cardvalue")
				.setDescription("Enter the card's value")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("cardcategories")
				.setDescription(
					"Enter the card's categories (separated by commas)"
				)
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setName("cardrarity")
				.setDescription(
					"Enter the card's rarity (0-5, 5 being the most rare)"
				)
				.setRequired(true)
		)
		.addIntegerOption((option) =>
			option
				.setName("version")
				.setDescription("Enter the version of this card")
		)
		.addIntegerOption((option) =>
			option
				.setName("update")
				.setDescription(
					"Enter the ID of the card to update (leave blank to create a new card)"
				)
		),
	async execute(interaction) {
		if (interaction.user.id !== ownerId) return;
		// Get option values from the interaction
		const cardName = interaction.options
			.getString("cardname")
			.toLowerCase();
		const cardValue = parseInt(
			interaction.options.getString("cardvalue"),
			10
		);
		const cardCategories = interaction.options.getString("cardcategories");
		const categoryArray = cardCategories
			.split(",")
			.map((category) => category.trim());

		const cardRarity = interaction.options.getInteger("cardrarity");
		const updateCardId = interaction.options.getInteger("update");
		const version = interaction.options.getInteger("version") || 0;
		const query = new Query(collectionName); // Instantiate the Query class

		try {
			if (updateCardId) {
				// Update existing card data for the specified card ID
				await query.updateOne(
					{ name: cardName },
					{
						name: cardName,
						power: cardValue,
						categories: categoryArray,
						rarity: parseInt(cardRarity, 10),
					}
				);
				console.log(
					`Card "${cardName}" (ID ${updateCardId}) updated in the database.`
				);
				await interaction.reply(
					`Card "${cardName}" (ID ${updateCardId}) updated successfully!`
				);
			} else {
				// Insert the new card into the animeCardList collection
				const insertQuery = {
					name: `${cardName}`,
					power: parseInt(cardValue, 10),
					categories: categoryArray,
					owned: 0,
					rarity: parseInt(cardRarity, 10), // Convert to integer
					version: parseInt(version, 10), // Convert
				};
				await query.insertOne(insertQuery);
				console.log(
					`Card "${cardName}" created successfully in the database.`
				);
				await interaction.reply(
					`Card "${cardName}" created successfully!`
				);
			}
		} catch (error) {
			console.error("Error:", error.message);
			await interaction.reply(
				"An error occurred while creating or updating the card."
			);
		}
	},
};
