const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const Query = require("../../databases/query.js"); // Path to your Query class

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
            const cardData = await query.findOne({ name: cardName });

            if (!cardData) {
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
            const moves = await moveQuery.find({ cardId: cardData._id });

            const formattedMoves = moves.map((move) => {
                return `Move: ${move.moveName}, Description: ${move.moveDescription}, Type: ${move.moveType}, Base DMG: ${move.baseDMG}`;
            });

            // Retrieve associated photos
            const photoQuery = new Query("animeCardPictures"); // Collection for photos
            const photos = await photoQuery.find({ cardId: cardData._id });

            const photoUrls = photos.map((photo) => photo.pictureData);

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
        } finally {
            await query.closeConnection(); // Close the MongoDB connection
        }
    },
};
