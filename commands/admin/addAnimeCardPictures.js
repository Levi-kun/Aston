const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); // Replace with your actual ownerId

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const { link } = require("fs");
const dbRunAsync = util.promisify(db.run.bind(db));

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("editimage")
        .setDMPermission(false)
        .setDescription(
            "Add, update, or remove an image from the anime card pictures database"
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("cardid")
                    .setDescription(
                        "Enter the ID of the card you want to associate the image with"
                    )
                    .setRequired(true) // Make this option required
        )
        .addStringOption(
            (option) =>
                option
                    .setName("imageurl")
                    .setDescription(
                        "Enter the URL of the image you want to add"
                    )
                    .setRequired(true) // Make this option optional
        )
        .addStringOption(
            (option) =>
                option
                    .setName("imagelink")
                    .setDescription("Attach the link to image")
                    .setRequired(true) // Make this option optional
        )
        .addBooleanOption(
            (option) =>
                option
                    .setName("update")
                    .setDescription(
                        "Set to true if you want to update an existing image, false otherwise"
                    )
                    .setRequired(false) // Make this option optional
        )
        .addIntegerOption(
            (option) =>
                option
                    .setName("imageid")
                    .setDescription(
                        "Enter the ID of the image you want to modify"
                    )
                    .setRequired(false) // Make this option optional
        )
        .addBooleanOption(
            (option) =>
                option
                    .setName("remove")
                    .setDescription(
                        "Set to true if you want to remove an existing image, false otherwise"
                    )
                    .setRequired(false) // Make this option optional
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
                await dbRunAsync(
                    `
                    DELETE FROM animeCardPictures
                    WHERE id = ?;
                `,
                    [imageId]
                );
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
                if (!cardId) {
                    await interaction.reply(
                        "Please provide the card ID to update the image."
                    );
                    return;
                }
                // Update existing image for the specified card ID
                await dbRunAsync(
                    `
                    UPDATE animeCardPictures
                    SET pictureData = ?, link  = ?
                    WHERE cardId = ?, id = ?;
                `,
                    [imageToInsert, imageLink, cardId, imageId]
                );
                await interaction.reply(
                    `Image updated for card ID ${cardId} successfully!`
                );
            } else {
                // Insert the image into the animeCardPictures table
                await dbRunAsync(
                    `
                    INSERT INTO animeCardPictures (cardId, attachment, pictureData, link)
                    VALUES (?, ?, ?, ?);
                `,
                    [cardId, 0, imageToInsert, imageLink]
                );
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
        }
    },
};
