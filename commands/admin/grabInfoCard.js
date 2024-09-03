const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db");
const util = require("util");
const dbAllAsync = util.promisify(db.all.bind(db));

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("cardinfo")
        .setDescription("Retrieve data and moves for a specific anime card")
        .addStringOption((option) =>
            option
                .setName("cardname")
                .setDescription("Enter the name of the card you want to retrieve data for")
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        // Get option value from the interaction
        const cardName = interaction.options.getString("cardname");

        try {
            // Retrieve data for the specified card name
            const query = `
                SELECT *
                FROM animeCardList
                WHERE Name = ?
            `;
            const cardData = await dbAllAsync(query, [cardName]);

            if (cardData.length === 0) {
                await interaction.reply(`No data found for card "${cardName}".`);
            } else {
                // Assuming you want to display the data in a formatted way
                const formattedData = cardData.map((card) => {
                    return `ID: ${card.id}, Name: ${card.Name}, Value: ${card.Value}, Categories: ${card.Categories}, Rarity: ${card.Rarity}`;
                });

                // Retrieve moves associated with the card
                const moveQuery = `
                    SELECT moveName, moveDescription, moveType, baseDMG
                    FROM animeCardMoves
                    WHERE cardId = ?
                `;
                const moves = await dbAllAsync(moveQuery, [cardData[0].id]);
                
                const formattedMoves = moves.map((move) => {
                    return `Move: ${move.moveName}, Description: ${move.moveDescription}, Type: ${move.moveType}, Base DMG: ${move.baseDMG}`;
                });

                // Retrieve associated photos
                const photoQuery = `
                    SELECT pictureData
                    FROM animeCardPictures
                    WHERE cardId = ?
                `;
                const photos = await dbAllAsync(photoQuery, [cardData[0].id]);

                const photoUrls = photos.map((photo) => photo.pictureData);

                await interaction.reply(`Data for card "${cardName}":\n${formattedData.join("\n")}\nMoves:\n${formattedMoves.join("\n")}\nPhotos:\n${photoUrls.join("\n")}`);
            }
        } catch (error) {
            console.error("Error retrieving card data:", error.message);
            await interaction.reply("An error occurred while retrieving card data.");
        }
    },
};
