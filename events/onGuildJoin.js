const { Events } = require("discord.js");
const sql = require("../databases/index.js");

module.exports = {
    name: Events.GuildCreate,

    async execute(guild) {
        const { id: guildId, name: guildName } = guild;

        if (!guildId || !guildName) {
            throw new Error("Guild is missing its ID or name.");
        }

        try {
            // Fetch the complete current membership before modifying data.
            const members = await guild.members.fetch();

            // Ignore bot accounts if your database tracks human players only.
            const currentMembers = [...members.values()].filter(
                member => !member.user.bot
            );

            const currentUserIds = currentMembers.map(
                member => member.user.id
            );

            await sql.begin(async tx => {
                // 1. Create or update the guild without resetting created_at.
                await tx`
                    INSERT INTO guilds (id, name)
                    VALUES (${guildId}, ${guildName})
                    ON CONFLICT (id)
                    DO UPDATE SET name = EXCLUDED.name
                `;

                // 2. Create or update each user and their guild relationship.
                for (const member of currentMembers) {
                    const userId = member.user.id;
                    const username = member.user.username || "Unknown";
                    const displayName = member.displayName || username;

                    await tx`
                        INSERT INTO users (id, name)
                        VALUES (${userId}, ${username})
                        ON CONFLICT (id)
                        DO UPDATE SET name = EXCLUDED.name
                    `;

                    await tx`
                        INSERT INTO guild_users (
                            user_id,
                            guild_id,
                            display_name,
                            left_guild
                        )
                        VALUES (
                            ${userId},
                            ${guildId},
                            ${displayName},
                            FALSE
                        )
                        ON CONFLICT (user_id, guild_id)
                        DO UPDATE SET
                            display_name = EXCLUDED.display_name,
                            left_guild = FALSE
                    `;
                }

                // 3. Mark previously recorded members who are absent.
                if (currentUserIds.length === 0) {
                    await tx`
                        UPDATE guild_users
                        SET left_guild = TRUE
                        WHERE guild_id = ${guildId}
                    `;
                } else {
                    await tx`
                        UPDATE guild_users
                        SET left_guild = TRUE
                        WHERE guild_id = ${guildId}
                          AND user_id NOT IN ${tx(currentUserIds)}
                    `;
                }
            });

            console.log(
                `Synchronized guild ${guildName} (${guildId}): ` +
                `${currentMembers.length} members`
            );
        } catch (error) {
            console.error(
                `Error synchronizing guild ${guildId}:`,
                error
            );

            throw error;
        }
    },
};
