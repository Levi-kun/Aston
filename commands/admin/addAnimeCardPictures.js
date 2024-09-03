const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require('../../config.json'); // Replace with your actual ownerId


const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("addimage")
        .setDescription("Add an image to the anime card pictures database")
        .addIntegerOption(option =>
            option
                .setName("cardid")
                .setDescription("Enter the ID of the card you want to associate the image with")
                .setRequired(true)
        )
        .addStringOption(option =>
            option
                .setName("imageurl")
                .setDescription("Enter the URL of the image you want to add")
        )
        .addAttachmentOption(option =>
            option
                .setName("imageattachment")
                .setDescription("Attach an image file to add")
        )
        .addBooleanOption(option =>
            option
                .setName("update")
                .setDescription("Set to true if you want to update an existing image, false otherwise")
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        // Get option values from the interaction
        const cardId = interaction.options.getInteger("cardid");
        const imageUrl = interaction.options.getString("imageurl");
        let imageAttachment = interaction.options.getAttachment("imageattachment");
        const update = interaction.options.getBoolean("update") || false;
        let iNO = 0;

        try {
            // Use either the provided image URL or the attached image
            if (imageAttachment) {
                iNO = 1;
                imageAttachment = imageAttachment.attachment
            }
            const imageToInsert = imageUrl || imageAttachment;

            if (!imageToInsert) {
                await interaction.reply("Please provide either an image URL or attach an image.");
                return;
            }
            

            if (update) {
                // Update existing image for the specified card ID
                await dbRunAsync(`
                    UPDATE animeCardPictures
                    SET pictureData = ?
                    WHERE cardId = ?;
                `, [imageToInsert, cardId]);
                await interaction.reply(`Image updated for card ID ${cardId} successfully!`);
            } else {
                // Insert the image into the animeCardPictures table
                await dbRunAsync(`
                    INSERT INTO animeCardPictures (cardId, attachment, pictureData)
                    VALUES (?, ?, ?);
                `, [cardId, iNO, imageToInsert]);
                await interaction.reply(`Image added to card ID ${cardId} successfully!`);
            }
        } catch (error) {
            console.error("Error adding/updating image:", error.message);
            await interaction.reply("An error occurred while adding/updating the image.");
        }
    },
};
