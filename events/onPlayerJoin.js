const { Events } = require("discord.js");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db");
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

async function createOrInsertUser(guildId, userId, userName) {
    try {
        // Check if the table exists
        const tableExists = await dbRunAsync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [`${guildId}_users`]
        );

        if (!tableExists) {
            // Create the table
            await dbRunAsync(`
          CREATE TABLE IF NOT EXISTS \`${guildId}_users\` (
            user_id INTEGER PRIMARY KEY UNIQUE,
            name TEXT,
            cards TEXT,
            currentClaims INTEGER,
            lastClaimDate TEXT,
            wins INTEGER,
            losses INTEGER,
            value INTEGER,
            cardAmount INTEGER,
            pro BOOLEAN
          );
        `);
        }

        // Check if the user exists
        const existingUser = await dbRunAsync(
            `SELECT * FROM \`${guildId}_users\` WHERE user_id = ?`,
            [userId]
        );

        if (existingUser) {
            console.log(`User ID ${userId} already exists in the database.`);
        } else {
            // Insert the user
            await dbRunAsync(
                `
          INSERT INTO \`${guildId}_users\`
          (user_id, name, cards, currentClaims, lastClaimDate, wins, losses, value, cardAmount, pro)
          VALUES (?, ?, ' ', 0, ' ', 0, 0, 0, 0, 0)
        `,
                [userId, userName]
            );
            console.log(`User ${userName} (${userId}) added to the database.`);
        }
    } catch (error) {
        if (tableCreated === "false") {
            console.error("Error:", error.message);
        }
    }
}

module.exports = {
    name: Events.GuildMemberAdd, // Event for player join
    async execute(member) {
        console.log(`${member.displayName} Joined ${member.guild.name}`);
        try {
            const guild = member.guild;
            const guildId = guild.id;
            const guildUserCount = guild.memberCount;
            createOrInsertUser(
                member.guild.id,
                member.user.id,
                member.user.username
            );
            // Update the 'amountofUsers' field in the 'guildTable'
            db.run(
                `
        UPDATE guildTable
        SET amountofUsers = ?
        WHERE guildID = ?
        `,
                [guildUserCount, guildId],
                (err) => {
                    if (err) {
                        console.error("Error updating user count:", err);
                    } else {
                        console.log(`User joined guild: ${member.user.tag}`);
                    }
                }
            );
        } catch (error) {
            console.error("Error handling user join event:", error);
        }
    },
};
