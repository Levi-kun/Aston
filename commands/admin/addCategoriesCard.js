const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); // Replace with your actual ownerId

const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db"); // Adjust the database path as needed
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

async function createOrInsertUser(
    categoryName,
    categoryPower,
    categoryResistance,
    categoryVariability,
    critRate,
    critPower,
    domainLevel,
    update
) {
    try {
        if (update) {
            // Update existing card data for the specified card ID
            await dbRunAsync(
                `
            UPDATE animeCardCategories
            SET categoryName = ?, categoryPower = ?, categoryResistance = ?, categoryVariability = ?, CRITRATE = ?, CRITPOWER = ?, domainLevel = ?
            WHERE id = ?;
            `,
                [
                    categoryName,
                    categoryPower,
                    categoryResistance,
                    categoryVariability,
                    critRate,
                    critPower,
                    domainLevel,
                    update,
                ]
            );
            console.log(
                `Card "${categoryName}" (ID ${update}) updated in the database.`
            );
        } else {
            // Insert the user data into the main card data table
            await dbRunAsync(
                `
                INSERT INTO animeCardCategories (categoryName, categoryPower, categoryResistance, categoryVariability, CRITRATE, CRITPOWER, domainLevel)
                VALUES (?, ?, ?, ?, ?, ?, ?);
            `,
                [
                    categoryName,
                    categoryPower,
                    categoryResistance,
                    categoryVariability,
                    critRate,
                    critPower,
                    domainLevel,
                ]
            );
            console.log(`Category "${categoryName}" added to the database.`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    }
}

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("newcategories")
        .setDescription("Create categories")
        .addStringOption((option) =>
            option
                .setName("categoryname")
                .setDescription("Enter the category's name")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("categorypower")
                .setDescription("Enter the modifier on the cards power")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("categoryresistance")
                .setDescription("Enter the card's resistance modifier")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("categoryvariability")
                .setDescription("Enter the card's variablity (1%-10%)")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("categorycritrate")
                .setDescription("Enter the card's variablity (1%-10%)")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("categorycritpower")
                .setDescription("Enter the card's variablity (1%-10%)")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("domainlevel")
                .setDescription(
                    "(3. Highest Domain (Light vs Dark) 2. Quirky Domain 3. Attribute Domain)"
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
        const categoryName = interaction.options.getString("categoryname");
        const categoryPower = interaction.options.getString("categorypower");
        const categoryResistance =
            interaction.options.getString("categoryresistance");
        const categoryVariability = interaction.options.getInteger(
            "categoryvariability"
        );
        const categoryCritRate =
            interaction.options.getInteger("categorycritrate");
        const categoryCritPower =
            interaction.options.getInteger("categorycritpower");
        const domainLevel = interaction.options.getInteger("domainlevel");
        const updateCardId = interaction.options.getInteger("update");

        // Call the function to insert/update the card data
        await createOrInsertUser(
            categoryName,
            categoryPower,
            categoryResistance,
            categoryVariability,
            categoryCritRate,
            categoryCritPower,
            domainLevel,
            updateCardId
        );

        // Respond to the interaction
        await interaction.reply(
            updateCardId
                ? `Category "${categoryName}" (ID ${updateCardId}) updated successfully!`
                : `Category "${categoryName}" created successfully!`
        );
    },
};
