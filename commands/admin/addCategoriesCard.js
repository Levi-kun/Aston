const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); // Replace with your actual ownerId
const Query = require("../../databases/query.js"); // Path to your Query class

const collectionName = "animeCardCategories"; // Replace with your actual collection name

async function createOrInsertCategory(
    name,
    categories,
    owned,
    rarity,
    version,
    dmg,
    critChance,
    critDamage,
    weakness,
    strength,
    updateId
) {
    const query = new Query(collectionName); // Instantiate the Query class

    try {
        const categoryData = {
            name,
            categories, // Expecting this to be an array based on schema
            owned,
            rarity,
            version,
            dmg,
            critChance,
            critDamage,
            weakness,
            strength,
        };

        if (updateId) {
            // Update existing category data for the specified ID
            await query.updateOne(
                { _id: updateId }, // MongoDB uses `_id` for document IDs
                categoryData
            );
            console.log(
                `Category "${name}" (ID ${updateId}) updated in the database.`
            );
        } else {
            // Insert the new category into the animeCardCategories collection
            await query.insertOne(categoryData);
            console.log(`Category "${name}" added to the database.`);
        }
    } catch (error) {
        console.error("Error:", error.message);
    } finally {
        await query.closeConnection(); // Close the MongoDB connection
    }
}

module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("newcategories")
        .setDescription("Create categories")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("Enter the category's name")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("categories")
                .setDescription(
                    "Enter the category/ies associated (comma separated)"
                )
                .setRequired(true)
        )
        .addBooleanOption((option) =>
            option
                .setName("owned")
                .setDescription("Is the category owned?")
                .setRequired(true)
        )
        .addStringOption((option) =>
            option
                .setName("rarity")
                .setDescription("Enter the rarity of the category")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("version")
                .setDescription("Enter the version of the category")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("dmg")
                .setDescription("Enter the damage value of the category")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("critchance")
                .setDescription(
                    "Enter the critical chance value of the category"
                )
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("critdamage")
                .setDescription(
                    "Enter the critical damage value of the category"
                )
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("weakness")
                .setDescription("Enter the weakness value of the category")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("strength")
                .setDescription("Enter the strength value of the category")
                .setRequired(true)
        )
        .addIntegerOption((option) =>
            option
                .setName("update")
                .setDescription(
                    "Enter the ID of the category to update (leave blank to create a new category)"
                )
        ),
    async execute(interaction) {
        if (interaction.user.id !== ownerId) return;

        // Get option values from the interaction
        const name = interaction.options.getString("name");
        const categoriesInput = interaction.options.getString("categories");
        const categories = categoriesInput.split(",").map((cat) => cat.trim()); // Convert string to array
        const owned = interaction.options.getBoolean("owned");
        const rarity = interaction.options.getString("rarity");
        const version = interaction.options.getInteger("version");
        const dmg = interaction.options.getInteger("dmg");
        const critChance = interaction.options.getInteger("critchance");
        const critDamage = interaction.options.getInteger("critdamage");
        const weakness = interaction.options.getInteger("weakness");
        const strength = interaction.options.getInteger("strength");
        const updateId = interaction.options.getInteger("update");

        // Call the function to insert/update the category data
        await createOrInsertCategory(
            name,
            categories,
            owned,
            rarity,
            version,
            dmg,
            critChance,
            critDamage,
            weakness,
            strength,
            updateId
        );

        // Respond to the interaction
        await interaction.reply(
            updateId
                ? `Category "${name}" (ID ${updateId}) updated successfully!`
                : `Category "${name}" created successfully!`
        );
    },
};
