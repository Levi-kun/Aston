const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

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
                .setName("movename")
                .setDescription("Enter the name of the move")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("movedescription")
                .setDescription("Enter the description of the move")
        )
        .addStringOption((option) =>
            option
                .setName("movetype")
                .setDescription(
                    "Enter the type of the move (e.g., physical, magical)"
                )
        )
        .addIntegerOption((option) =>
            option
                .setName("basedmg")
                .setDescription("Enter the base damage of the move")
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        const cardId = interaction.options.getInteger("cardid");
        const moveName = interaction.options.getString("movename");
        const moveDescription =
            interaction.options.getString("movedescription");
        const moveType = interaction.options.getString("movetype");
        const baseDMG = interaction.options.getInteger("basedmg");

        try {
            await dbRunAsync(
                `
                INSERT INTO animeCardMoves (cardId, moveName, moveDescription, moveType, baseDMG)
                VALUES (?, ?, ?, ?, ?);
            `,
                [cardId, moveName, moveDescription, moveType, baseDMG]
            );

            await interaction.reply(`Move "${moveName}" added successfully!`);
        } catch (error) {
            console.error("Error adding move:", error.message);
            await interaction.reply("An error occurred while adding the move.");
        }
    },
};
