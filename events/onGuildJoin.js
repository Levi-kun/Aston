const { Events } = require("discord.js");

const version = process.env.VERSION;

module.exports = {
	name: Events.GuildCreate,
	async execute(guild) {
		try {
			const textChannel = guild.channels.cache.find(
				(channel) =>
					channel.type === "GUILD_TEXT" &&
					(channel
						.permissionsFor(guild.client.user)
						.has("SEND_MESSAGES") ||
						guild.me.permissions.has("ADMINISTRATOR"))
			);
			console.log(textChannel);
			if (textChannel) {
				console.log(`Found text channel: ${textChannel.name}`);
				textChannel.send("Yo Boss, you called?");
			} else {
				console.log("No suitable text channel found.");
			}

			const { id, name, memberCount } = guild;
			const guildId = id || null;
			const guildName = name || null;
			const guildUserCount = memberCount || 0;
			const gainADAY = config.default_values.gainADAY || 0;
			const searchADAY = config.default_values.searchADAY || 0;

			if (guildId) {
				/*
				//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "readOne", args: [{ id: guildId }] } INFORMATION.
				RECREATE THIS IN DB,

				-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

				*/
				/*
				//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "insertOne", args: [{ _id: "generated ID", id: guildId, name: guildName, amountofUsers: guildUserCount, gainADAY, searchADAY, version: 0, pro: false }] } INFORMATION.
				RECREATE THIS IN DB,

				-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

				*/
				/*
				//** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "updateChannelId", args: [guildId, textChannel.id, "default"] } INFORMATION.
				RECREATE THIS IN DB,

				-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

				*/
				/*
				//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "checkOne", args: [{ id: member.user.id, _guild_id: guild.id }] } INFORMATION.
				RECREATE THIS IN DB,

				-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

				*/
				/*
				//** TO DO! CONTACTED DATABASE WITH { collection: "userDataBase", operation: "insertOne", args: [{ id: member.user.id, _guild_id: guildId, name: member.user.username || "Unknown", wins: 0, losses: 0 }] } INFORMATION.
				RECREATE THIS IN DB,

				-- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

				*/
			}
		} catch (error) {
			console.error("Error executing guildCreate event:", error);
		}
	},
};
