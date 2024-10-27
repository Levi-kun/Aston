const { Events } = require("discord.js");
const { Query } = require("../databases/query.js");
const config = require("../config.json");
const version = config.version;

async function createOrInsertUser(guildId, userId, userName) {
	const userQuery = new Query("userDataBase");

	// Check if the user exists
	const checkQuery = { id: userId, _guild_id: guildId };
	const existingUser = await userQuery.checkOne(checkQuery);

	if (existingUser) {
		console.log(`User ID ${userId} already exists in the database.`);
		const updateQuery = {
			deprecated: false,
		};
		await userQuery.updateOne({ id: userId }, updateQuery);
	} else {
		// Insert the user
		const creationQuery = {
			id: userId,
			_guild_id: guildId,
			name: userName,
			wins: 0,
			losses: 0,
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
				{ amountofUsers: guildUserCount }
			);

			console.log(`User joined guild: ${member.user.tag}`);
		} catch (error) {
			console.error("Error handling user join event:", error);
		}
	},
};
