const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const Query = require("../../databases/query.js"); // Path to your Query class

const collectionName = "animeCardMoves"; // Replace with your actual collection name

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addmove")
        .setDescription("Add a new move to the anime card moves database")
        .addIntegerOption((option) =>
            option
                .setName("cardid")
                .setDescription(
                    "Enter the ID of the card associated with this move"
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("name") // Updated option
                .setDescription("Enter the name of the move")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("description") // Updated option
                .setDescription("Enter the description of the move")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("version") // New option
                .setDescription("Enter the version of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("dmg") // New option
                .setDescription("Enter the base damage of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("specialdmg") // New option
                .setDescription("Enter the special damage of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("ownmodifier") // New option
                .setDescription("Enter the own modifier of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("othermodifier") // New option
                .setDescription("Enter the other modifier of the move")
                .setRequired(true)
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        const cardId = interaction.options.getInteger("cardid");
        const moveName = interaction.options.getString("name");
        const moveDescription = interaction.options.getString("description");
        const version = interaction.options.getString("version");
        const baseDMG = interaction.options.getInteger("dmg");
        const specialDMG = interaction.options.getInteger("specialdmg");
        const ownModifier = interaction.options.getInteger("ownmodifier");
        const otherModifier = interaction.options.getInteger("othermodifier");

        const query = new Query(collectionName); // Instantiate the Query class

        try {
            // Insert the new move into the animeCardMoves collection
            await query.insertOne({
                cardId,
                moveName,
                moveDescription,
                version,
                baseDMG,
                specialDMG,
                ownModifier,
                otherModifier,
            });

            await interaction.reply(`Move "${moveName}" added successfully!`);
        } catch (error) {
            console.error("Error adding move:", error.message);
            await interaction.reply("An error occurred while adding the move.");
        } finally {
            await query.closeConnection(); // Close the MongoDB connection
        }
    },
};
