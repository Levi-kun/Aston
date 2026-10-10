const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildMemberAdd, // Event for player join
	async execute(member) {
		console.log(`${member.displayName} Joined ${member.guild.name}`);
		try {
			const guild = member.guild;
			const guildId = guild.id;
			const guildUserCount = guild.memberCount;
			/*
			//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "checkOne", args: [{ id: member.user.id, _guild_id: guildId }] } INFORMATION.
			RECREATE THIS IN DB,

			-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

			*/
			/*
			//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "updateOne", args: [{ id: member.user.id }, { deprecated: false }] } INFORMATION.
			RECREATE THIS IN DB,

			-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

			*/
			/*
			//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "insertOne", args: [{ id: member.user.id, _guild_id: guildId, name: member.user.username, wins: 0, losses: 0 }] } INFORMATION.
			RECREATE THIS IN DB,

			-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

			*/
			/*
			//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "updateOne", args: [{ id: guildId }, { amountofUsers: guildUserCount }] } INFORMATION.
			RECREATE THIS IN DB,

			-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

			*/

			console.log(`User joined guild: ${member.user.tag}`);
		} catch (error) {
			console.error("Error handling user join event:", error);
		}
	},
};
