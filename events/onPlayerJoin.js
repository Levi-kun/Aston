const { Events } = require("discord.js");
const sql = require("../databases/index.js")

module.exports = {
	name: Events.GuildMemberAdd, // Event for player join
	async execute(member) {
		const guild = member.guild;

		if (member.user.bot) return console.error(`Failed: User is a bot`);
		if (!guild || typeof member.guild !== "object" ) return console.error(`Failed: User is not in a Guild`)

		try {

			const checkQueryAndCreateUser =  await sql`INSERT INTO users (id, name) VALUES (${member.user.id}, ${member.user.username}) ON CONFLICT (id) DO NOTHING`;
			const createGuildUser = await sql`INSERT into guild_users (user_id, guild_id, display_name) VALUES (${member.user.id}, ${guild.id}, ${member.displayName})`

		} catch (error) {
			console.error("Error handling user join event:", error);
		} finally {
			console.log(`User joined guild: ${member.user.tag}`);
		}
	},
};
