const { Events } = require("discord.js");
const { Query } = require("../databases/query.js");
const config = require("../config.json");
const version = config.version;

async function createOrInsertUser(guildId, userId, userName) {
    const userQuery = new Query("userDataBase");

    // Check if the user exists
    const checkQuery = { _id: userId, _guildId: guildId };
    const existingUser = await userQuery.readOne(checkQuery);

    if (existingUser) {
        console.log(`User ID ${userId} already exists in the database.`);
    } else {
        // Insert the user
        const creationQuery = {
            _id: userId,
            _guildId: guildId,
            name: userName,
        };
        await userQuery.insertOne(creationQuery);
        console.log(`User ${userName} (${userId}) added to the database.`);
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
            await createOrInsertUser(
                guildId,
                member.user.id,
                member.user.username
            );

            // Update the 'amountofUsers' field in the 'guildTable' in MongoDB
            const guildQuery = new Query("guildDataBase");
            await guildQuery.updateOne(
                { id: guildId },
                { $set: { amountofUsers: guildUserCount } }
            );

            console.log(`User joined guild: ${member.user.tag}`);
        } catch (error) {
            console.error("Error handling user join event:", error);
        }
    },
};
