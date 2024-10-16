const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
const { Query } = require("../../databases/query.js"); // Path to your Query class
const { ObjectId } = require("mongodb");
const collectionName = "animeCardMoves"; // Replace with your actual collection name

module.exports = {
    data: new SlashCommandBuilder()
        .setName("addmove")
        .setDescription("Add a new move to the anime card moves database")
        .addStringOption((option) =>
            option
                .setName("id")
                .setDescription(
                    "Enter the ID of the card or category associated with this move"
                )
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("iscard")
                .setDescription(
                    "Is this move for a specific card? (true/false)"
                )
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Enter the name of the move")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("description")
                .setDescription("Enter the description of the move")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("version")
                .setDescription("Enter the version of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("dmg")
                .setDescription("Enter the base damage of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("specialdmg")
                .setDescription("Enter the special damage of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("ownmodifier")
                .setDescription("Enter the own modifier of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("othermodifier")
                .setDescription("Enter the other modifier of the move")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("duration")
                .setDescription("set duration if possible")
                .setRequired(true)
        ),

    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        const duration = interaction.options.getInteger("duration");
        const id = interaction.options.getString("id");
        const isCard = interaction.options.getBoolean("iscard");
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
                name: moveName,
                description: moveDescription,
                version: version,
                value: baseDMG,
                specialdmg: specialDMG,
                ownModifier: ownModifier,
                otherModifier: otherModifier,
                parent: {
                    id: id, // ID of the card or category
                    isCard: isCard, // True if it's for a specific card, false if it's for a category
                },
                duration: duration,
            });

            await interaction.reply(`Move "${moveName}" added successfully!`);
        } catch (error) {
            console.error("Error adding move:", error.message);
            await interaction.reply("An error occurred while adding the move.");
        }
    },
};
