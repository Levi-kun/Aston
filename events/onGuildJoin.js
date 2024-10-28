const { Events } = require("discord.js");
const config = require("../config.json");

const { Query } = require("../databases/query.js");
const configA = require("../config.json");

const { ObjectId } = require("mongodb");

const version = configA.version;

module.exports = {
	name: Events.GuildCreate,
	async execute(guild) {
		const guildQuery = new Query("guildDataBase");
		const userQuery = new Query("userDataBase");

		const checkQuery = {
			id: guild.id,
		};

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

			// Only check the database if guild ID exists
			if (guildId) {
				const exist = await guildQuery.readOne(checkQuery);

				if (Object.keys(exist).length === 0) {
					// Create the base of the creationQuery
					const creationQuery = {
						_id: new ObjectId(),
						id: guildId,
						name: guildName,
						amountofUsers: guildUserCount,
						gainADAY: gainADAY,
						searchADAY: searchADAY,
						version: 0,
						pro: false,
					};

					await guildQuery.insertOne(creationQuery);

					// Only add channelInformation if textChannel exists
					if (textChannel) {
						await guildQuery.updateChannelId(
							guildId,
							textChannel.id,
							"default"
						);
					}
					console.log(
						`Guild ${guildName} (${guildId}) added to database.`
					);
				} else {
					console.log(
						`Guild ${exist.name} (${exist._id}) already exists in database.`
					);
				}

				// Fetch all members in the guild
				guild.members.fetch().then(async (members) => {
					const userInsertions = members.map(async (member) => {
						const userId = member.user.id;
						const userCheckQuery = {
							id: userId,
							_guild_id: guild.id,
						};

						const userExists = await userQuery.checkOne(
							userCheckQuery
						);
						if (userExists) return;

						const userName = member.user.username || "Unknown";
						const userQueryData = {
							id: userId,
							_guild_id: guildId,
							name: userName,
							wins: 0,
							losses: 0,
						};
						return userQuery.insertOne(userQueryData);
					});

					await Promise.all(userInsertions);
					console.log(
						`All members of guild ${guildName} have been added to the userDataBase.`
					);
				});
			}
		} catch (error) {
			console.error("Error executing guildCreate event:", error);
		}
	},
};
