const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const { Query } = require("../../databases/query.js");
const { ObjectId } = require("mongodb"); // Ensure you import ObjectId

const collectionName = "animeCardPhotos";
const cardQuery = new Query("animeCardList");

module.exports = {
	category: "admin",
	data: new SlashCommandBuilder()
		.setName("editimage")
		.setDescription(
			"Add, update, or remove an image from the anime card pictures database"
		)
		.addStringOption((option) =>
			option
				.setName("name")
				.setDescription(
					"Enter the name of the card you want to associate the image with"
				)
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("imageurl")
				.setDescription("Enter the URL of the image you want to add")
				.setRequired(true)
		)
		.addStringOption((option) =>
			option
				.setName("imagelink")
				.setDescription("Attach the link to image")
				.setRequired(true)
		)
		.addBooleanOption((option) =>
			option
				.setName("update")
				.setDescription(
					"Set to true if you want to update an existing image, false otherwise"
				)
				.setRequired(false)
		)
		.addStringOption((option) =>
			option
				.setName("imageid")
				.setDescription("Enter the ID of the image you want to modify")
				.setRequired(false)
		)
		.addBooleanOption((option) =>
			option
				.setName("remove")
				.setDescription(
					"Set to true if you want to remove an existing image, false otherwise"
				)
				.setRequired(false)
		),
	async execute(interaction) {
		if (interaction.user.id !== ownerId) return;

		// Get option values from the interaction
		const cardName = interaction.options.getString("name");
		const imageId = interaction.options.getString("imageid");
		const imageUrl = interaction.options.getString("imageurl");
		const imageLink = interaction.options.getString("imagelink");
		const update = interaction.options.getBoolean("update") || false;
		const remove = interaction.options.getBoolean("remove") || false;

		// Fetch the card using the name provided
		const card = await cardQuery.readOne({ name: cardName });
		const cardId = card ? card._id : null; // Get the ObjectId of the card

		if (!cardId) {
			await interaction.reply(
				"Card not found. Please check the card name."
			);
			return;
		}

		const query = new Query(collectionName); // Instantiate the Query class

		try {
			console.log(
				`Processing command with options: cardId=${cardId}, imageId=${imageId}, imageUrl=${imageUrl}, update=${update}, remove=${remove}`
			);

			if (remove) {
				if (!imageId) {
					await interaction.reply(
						"Please provide the image ID to remove."
					);
					return;
				}
				// Remove the specific image by its ID
				await query.removeOne({ _id: new ObjectId(imageId) }); // Ensure you use ObjectId for _id
				await interaction.reply(
					`Image with ID ${imageId} removed successfully!`
				);
				return;
			}

			if (!imageUrl) {
				await interaction.reply("Please provide a valid image URL.");
				return;
			}

			if (update) {
				if (!imageId) {
					await interaction.reply(
						"Please provide the image ID to update the image."
					);
					return;
				}
				// Update existing image for the specified card ID
				await query.updateOne(
					{
						card_id: new ObjectId(cardId),
						_id: new ObjectId(imageId),
					}, // Ensure both IDs are ObjectIds
					{ attachment: imageUrl, pictureLink: imageLink }
				);
				await interaction.reply(
					`Image updated for card ID ${cardId} successfully!`
				);
			} else {
				// Insert the image into the animeCardPictures collection
				await query.insertOne({
					card_id: new ObjectId(cardId), // Correctly assign ObjectId here
					attachment: imageUrl,
					pictureLink: imageLink,
				});
				await interaction.reply(
					`Image added to card ID ${cardId} successfully!`
				);
			}
		} catch (error) {
			console.error("Error adding/updating/removing image:", error);
			await interaction.reply(
				"An error occurred while adding, updating, or removing the image."
			);
		}
	},
};
