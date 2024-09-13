const { Events } = require("discord.js");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db");

module.exports = {
    name: Events.GuildMemberRemove, // Event for player leave
    async execute(member) {
        console.log(`${member.displayName} has left ${member.guild.name}`);
        try {
            const guild = member.guild;
            const guildId = guild.id;
            const guildUserCount = guild.memberCount;

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
                        console.log(`User left guild: ${member.user.tag}`);
                    }
                }
            );
        } catch (error) {
            console.error("Error handling user leave event:", error);
        }
    },
};
