const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); // Replace with your actual ownerId

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

async function createOrInsertUser(
    cardName,
    cardValue,
    cardCategories,
    rarity,
    update
) {
    try {
        // Create the card pictures table (if not exists)
        await dbRunAsync(`
            CREATE TABLE IF NOT EXISTS "animeCardPictures" (
                "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
                "cardId" INTEGER NOT NULL,
                "attachment" INTEGER,
                "pictureData" BLOB,
                FOREIGN KEY ("cardId") REFERENCES "animeCardList" ("id")
            );
        `);

        if (update) {
            // Update existing card data for the specified card ID
            await dbRunAsync(
                `
                UPDATE animeCardList
                SET Name = ?, Value = ?, Categories = ?, Rarity = ?
                WHERE id = ?;
            `,
                [cardName, cardValue, cardCategories, rarity, update]
            );
            console.log(
                `Card "${cardName}" (ID ${update}) updated in the database.`
            );
        } else {
            // Insert the user data into the main card data table
            await dbRunAsync(
                `
                INSERT INTO animeCardList (Name, Value, Categories, Owned, focus, inPool, Rarity)
                VALUES (?, ?, ?, 0, 0, 1, ?);
            `,
                [cardName, cardValue, cardCategories, rarity]
            );
            console.log(`Card "${cardName}" added to the database.`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

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
                    "Set to true if you want to update an existing card, false otherwise"
                )
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        // Get option values from the interaction
        const cardName = interaction.options
            .getString("cardname")
            .toLowerCase();
        const cardValue = interaction.options.getString("cardvalue");
        const cardCategories = interaction.options.getString("cardcategories");
        const cardRarity = interaction.options.getInteger("cardrarity");
        const updateCardId = interaction.options.getInteger("update");

        // Call the function to insert/update the card data
        await createOrInsertUser(
            cardName,
            cardValue,
            cardCategories,
            cardRarity,
            updateCardId
        );

        // Respond to the interaction
        await interaction.reply(
            updateCardId
                ? `Card "${cardName}" (ID ${updateCardId}) updated successfully!`
                : `Card "${cardName}" created successfully!`
        );
    },
};
