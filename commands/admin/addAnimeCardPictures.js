const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); 
const Query = require("../../databases/query.js");

const collectionName = "animeCardPhotos"; 

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("editimage")
        .setDescription(
            "Add, update, or remove an image from the anime card pictures database"
        )
        .addIntegerOption((option) =>
            option
                .setName("cardid")
                .setDescription(
                    "Enter the ID of the card you want to associate the image with"
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
        .addIntegerOption((option) =>
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
        const cardId = interaction.options.getInteger("cardid");
        const imageId = interaction.options.getInteger("imageid");
        const imageUrl = interaction.options.getString("imageurl");
        let imageLink = interaction.options.getString("imagelink");
        const update = interaction.options.getBoolean("update") || false;
        const remove = interaction.options.getBoolean("remove") || false;

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
                await query.removeOne({ _id: imageId });
                await interaction.reply(
                    `Image with ID ${imageId} removed successfully!`
                );
                return;
            }

            const imageToInsert = imageUrl;

            if (!imageToInsert) {
                await interaction.reply(
                    "Please provide either an image URL or attach an image."
                );
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
                    { cardId: cardId, _id: imageId },
                    { pictureData: imageToInsert, link: imageLink }
                );
                await interaction.reply(
                    `Image updated for card ID ${cardId} successfully!`
                );
            } else {
                // Insert the image into the animeCardPictures collection
                await query.insertOne({
                    cardId: cardId,
                    attachment: 0,
                    pictureData: imageToInsert,
                    link: imageLink,
                });
                await interaction.reply(
                    `Image added to card ID ${cardId} successfully!`
                );
            }
        } catch (error) {
            console.error("Error adding/updating/removing image:", error);
            console.error("Stack trace:", error.stack);
            await interaction.reply(
                "An error occurred while adding, updating, or removing the image."
            );
        } finally {
            await query.closeConnection(); // Close the MongoDB connection
        }
    },
};
