const { SlashCommandBuilder } = require('discord.js');
const sqlite3 = require('sqlite3');

const { ownerId } = require("../../config.json");
// Create a new SQLite database connection
const db = new sqlite3.Database('databases/animeDataBase.db');

// Custom function to retrieve all rows from a table
async function getAllRows(tableName) {
    return new Promise((resolve, reject) => {
        db.all(`SELECT * FROM "${tableName}"`, (err, rows) => {
            if (err) {
                reject(err);
            } else {
                resolve(rows);
            }
        });
    });
}

// Custom function to run a single SQL command
async function runSql(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, (err) => {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

async function synchronizeGuildCopy(guildId) {
    try {
        // Fetch the global animeCardList data
        const globalRows = await getAllRows('animeCardList');

        // Fetch the guild-specific copy data
        const guildRows = await getAllRows(`${guildId}_cards`);

        // Create a map of global rows indexed by their ID
        const globalMap = new Map(globalRows.map((row) => [row.id, row]));

        // Check each guild row
        for (const guildRow of guildRows) {
            const globalRow = globalMap.get(guildRow.id);

            if (!globalRow) {
                // Row exists in guild copy but not in global; delete it
                await runSql(`DELETE FROM "${guildId}_cards" WHERE id = ?`, [guildRow.id]);
            } else {
                // Row exists in both; check for updates
                if (
                    guildRow.Name !== globalRow.Name ||
                    guildRow.Categories !== globalRow.Categories ||
                    guildRow.Value !== globalRow.Value ||
                    guildRow.Rarity !== globalRow.Rarity
                ) {
                    // Update the guild copy with global data
                    await runSql(
                        `UPDATE "${guildId}_cards" SET Name = ?, Categories = ?, Value = ?, Rarity = ? WHERE id = ?`,
                        [globalRow.Name, globalRow.Categories, globalRow.Value, globalRow.Rarity, guildRow.id]
                    );
                }
            }
        }

        // Check for new rows in global data
        for (const globalRow of globalRows) {
            const guildRow = guildRows.find((row) => row.id === globalRow.id);
            if (!guildRow) {
                // Row exists in global but not in guild copy; insert it
                await runSql(
                    `INSERT INTO "${guildId}_cards" (id, Name, Categories, Value, Rarity, focus, inPool, Owned) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [globalRow.id, globalRow.Name, globalRow.Categories, globalRow.Value, globalRow.Rarity, globalRow.focus, globalRow.inPool, globalRow.Owned]
                );
            }
        }

        console.log('Guild copy synchronized successfully.');
    } catch (error) {
        console.error('Error synchronizing guild copy:', error);
    }
}

module.exports = {
    category: 'admin',
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName('refreshcards')
        .setDescription('Refreshes anime card data for a specific guild'),

    async execute(interaction) {
        if (interaction.user.id !== ownerId) {
            await interaction.reply('You do not have permission to use this command.');
            return;
        }

        await synchronizeGuildCopy(interaction.guild.id);
        await interaction.reply('Anime card data synchronized successfully.');
    },
};
