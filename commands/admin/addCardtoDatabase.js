const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const Query = require("../../databases/query.js");

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
        const cardValue = interaction.options.getString("cardvalue");
        const cardCategories = interaction.options
            .getString("cardcategories")
            .split(",")
            .map((category) => category.trim());
        const cardRarity = interaction.options.getInteger("cardrarity");
        const updateCardId = interaction.options.getInteger("update");

        const query = new Query(collectionName); // Instantiate the Query class

        try {
            if (updateCardId) {
                // Update existing card data for the specified card ID
                await query.updateOne(
                    { _id: updateCardId },
                    {
                        Name: cardName,
                        Value: cardValue,
                        Categories: cardCategories,
                        Rarity: cardRarity,
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
                await query.insertOne({
                    Name: cardName,
                    Value: cardValue,
                    Categories: cardCategories,
                    Owned: 0,
                    focus: 0,
                    inPool: 1,
                    Rarity: cardRarity,
                });
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
        } finally {
            await query.closeConnection(); // Close the MongoDB connection
        }
    },
};
