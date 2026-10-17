
const { Events } = require("discord.js");
const sql = require("../databases/index.js");

module.exports = {
    name: Events.GuildMemberRemove,

    async execute(member) {
        if (!member.guild) {
            console.error("Failed: User is not in a Guild");
            return;
        }

        if (member.user.bot) {
            console.error("Failed: User is a bot");
            return;
        }

        try {
            await sql`
                UPDATE guild_users
                SET left_guild = TRUE
                WHERE user_id = ${member.user.id}
                  AND guild_id = ${member.guild.id}
            `;

            console.log(
                `Successfully marked ${member.user.id} as having left guild ${member.guild.id}`
            );
        } catch (err) {
            console.error("Failed to update guild membership:", err);
            throw err;
        }
    },
};