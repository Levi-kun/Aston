const { Events } = require("discord.js");

module.exports = {
	name: Events.GuildMemberRemove, // Event for player leave
	async execute(member) {
		console.log(`${member.displayName} has left ${member.guild.name}`);
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "updateOne", args: [{ id: member.guild.id }, { amountofUsers: member.guild.memberCount }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
		/*
		//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "updateOne", args: [{ id: member.user.id, _guild_id: member.guild.id }, { deprecated: true }] } INFORMATION.
		RECREATE THIS IN DB,

		-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

		*/
	},
};
