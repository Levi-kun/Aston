const { Events } = require("discord.js");
const { Query } = require("../databases/query.js");

module.exports = {
    name: Events.GuildMemberRemove, // Event for player leave
    async execute(member) {
        console.log(`${member.displayName} has left ${member.guild.name}`);
        try {
            const guild = member.guild;
            const guildId = guild.id;
            const guildUserCount = guild.memberCount;

            // Update the 'amountofUsers' field in the 'guildTable' in MongoDB
            const guildQuery = new Query("guildDataBase");
            await guildQuery.updateOne(
                { id: guildId },
                { amountofUsers: guildUserCount }
            );

            // Deprecate the user document in the userDataBase
            const userQuery = new Query("userDataBase");
            await userQuery.updateOne(
                { id: member.user.id, _guildId: guildId },
                { deprecated: true }
            );

            console.log(
                `User left guild and deprecated in database: ${member.user.tag}`
            );
        } catch (error) {
            console.error("Error handling user leave event:", error);
        }
    },
};
