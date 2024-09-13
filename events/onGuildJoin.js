const { Events } = require("discord.js");
const sqlite3 = require("sqlite3");
const config = require("../config.json");
const db = new sqlite3.Database("databases/animeDataBase.db");
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));

let tableCreated = false;

async function main(guildId, userId, userName, defaultChannel) {
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
        console.error("Error:", error.message);
    }
}

async function createCopy(guildId, defaultChannel) {
    try {
        const copiedTableExists = await dbRunAsync(
            `SELECT name FROM sqlite_master WHERE type='table' AND name=?`,
            [`${guildId}_cards`]
        );

        if (!copiedTableExists) {
            await dbRunAsync(`
                CREATE TABLE "${guildId}_cards" AS
                SELECT *
                FROM animeCardList
            `);
        }
    } catch (error) {
        if (error.message.includes("already exists")) {
            if (
                defaultChannel &&
                defaultChannel
                    .permissionsFor(defaultChannel.guild.me)
                    .has("SEND_MESSAGES")
            ) {
                defaultChannel.send("Another Round?");
            }
        } else {
            console.error("Error:", error.message);
        }
    }
}

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        console.log("Executing Guild");
        console.log(" ");
        try {
            const client = guild.client;
            const textChannels = guild.channels.cache.filter(
                (channel) => channel.type === "text"
            );

            textChannels.forEach((e) => {
                console.log(e.name);
            });

            const textChannel =
                textChannels.find((channel) =>
                    channel.permissionsFor(client).has("SEND_MESSAGES")
                ) || guild.systemChannel;
            let textChannelID = 0;
            if (textChannel) {
                textChannelID = textChannel.id;
                console.log(`Found text Channel: ${textChannel.name}`);
            } else {
                console.log(`No suitable text channel found.`);
            }

            const { id, name, memberCount } = guild;
            const guildId = id;
            const guildName = name;
            const guildUserCount = memberCount;
            const gainADAY = config.default_values.gainADAY;
            const searchADAY = config.default_values.searchADAY;
            const value = 0;
            const defaultChannelId = textChannelID;

            createCopy(guildId);

            // Insert or update the guild data in 'guildTable'
            db.get(
                "SELECT * FROM guildTable WHERE guildID = ?",
                [guild.id],
                (err, row) => {
                    if (row) {
                        // Guild already exists, update the existing row
                        db.run(
                            `
            UPDATE guildTable
            SET guildName = ?, amountofUsers = ?
            WHERE guildID = ?
          `,
                            [guildName, guildUserCount, guildId],
                            (updateErr) => {
                                if (updateErr) {
                                    console.error(
                                        "Error updating guild data:",
                                        updateErr
                                    );
                                } else {
                                    console.log(
                                        `Guild ${guildName}: (${guildId}) updated.`
                                    );
                                }
                            }
                        );
                    } else {
                        // Guild doesn't exist, insert a new row
                        db.run(
                            `
            INSERT INTO guildTable
            (guildID, guildName, amountofUsers, gainADAY, searchADAY, value, defaultChannelId)
            VALUES (?, ?, ?, ?, ?, ?, ?)
          `,
                            [
                                guildId,
                                guildName,
                                guildUserCount,
                                gainADAY,
                                searchADAY,
                                value,
                                defaultChannelId,
                            ],
                            (insertErr) => {
                                if (insertErr) {
                                    console.error(
                                        "Error inserting guild data:",
                                        insertErr
                                    );
                                } else {
                                    console.log(
                                        `Joined guild: ${name} (${id})`
                                    );
                                }
                            }
                        );
                    }

                    if (err) {
                        console.error("Error checking guild ID:", err);
                    }
                }
            );

            // Fetch all members in the guild
            guild.members.fetch().then((members) => {
                members.forEach((member) => {
                    const userId = member.user.id;
                    const userName = member.user.username;

                    // Check if the user exists in the "userDataBase" table
                    db.get(
                        "SELECT * FROM userDataBase WHERE UserID = ?",
                        [userId],
                        (err, row) => {
                            if (row) {
                                console.log(
                                    `ID ${userId} exists in the global database.`
                                );
                            } else {
                                // Insert the user into the "userDataBase" table
                                db.run(
                                    `
                  INSERT INTO userDataBase (UserID, userName, globalClaims, globalValue, totalVictories, totalLosses, globalCards)
                  VALUES (?, ?, 0, 0, 0, 0, 0)
                  `,
                                    [userId, userName],
                                    (err) => {
                                        if (err) {
                                            console.error(
                                                "Error inserting user:",
                                                err
                                            );
                                        } else {
                                            console.log(
                                                `User ${userName} (${userId}) added to the global database.`
                                            );
                                        }
                                    }
                                );
                            }

                            if (err) {
                                console.error("Error checking ID:", err);
                            }
                        }
                    );
                    main(guildId, userId, userName);
                });
            });
        } catch (error) {
            console.error("Error executing guildCreate event:", error);
        }

        console.log(" ");
    },
};
