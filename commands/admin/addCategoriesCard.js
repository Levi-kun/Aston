const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json"); // Replace with your actual ownerId
const Query = require("../../databases/query.js"); // Path to your Query class
const { ObjectId } = require("mongodb"); // Import ObjectId from MongoDB

const collectionName = "animeCardCategories"; // Collection name from schema

async function createOrInsertCategory(
    name,
    resistance,
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
            resistance, // An array of integers, per the schema
            version,
            dmg,
            critChance,
            critDamage,
            weakness,
            strength,
        };

        if (updateId) {
            // Update existing category data for the specified ID
            const objectId = new ObjectId(updateId); // Convert to ObjectId for MongoDB
            await query.updateOne(
                { _id: objectId }, // Use _id for MongoDB document identification
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
                .setName("resistance")
                .setDescription(
                    "Enter the resistance values (comma separated integers)"
                )
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
        .addStringOption((option) =>
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
        const resistanceInput = interaction.options.getString("resistance");
        const resistance = resistanceInput
            .split(",")
            .map((val) => parseInt(val.trim(), 10)); // Convert string to array of integers
        const version = interaction.options.getInteger("version");
        const dmg = interaction.options.getInteger("dmg");
        const critChance = interaction.options.getInteger("critchance");
        const critDamage = interaction.options.getInteger("critdamage");
        const weakness = interaction.options.getInteger("weakness");
        const strength = interaction.options.getInteger("strength");
        const updateId = interaction.options.getString("update");

        // Call the function to insert/update the category data
        await createOrInsertCategory(
            name,
            resistance,
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
