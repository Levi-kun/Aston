const { Events } = require("discord.js");
const config = require("../config.json");

const { Query } = require("../databases/query.js");
const configA = require("../config.json");
const version = configA.version;
let tableCreated = false;

module.exports = {
    name: Events.GuildCreate,
    async execute(guild) {
        const guildQuery = new Query("guildDataBase");
        const checkQuery = {
            guild_id: guild.id,
        };

        try {
            const client = guild.client;
            const textChannels = guild.channels.cache.filter(
                (channel) => channel.type === "text"
            );

            textChannels.forEach((e) => {
                console.log(e.name);
            });

            const textChannel =
                textChannels.find((channel) =>
                    channel.permissionsFor(client).has("SEND_MESSAGES")
                ) || guild.systemChannel;
            let textChannelID = 0;
            if (textChannel) {
                textChannelID = textChannel.id;
                console.log(`Found text Channel: ${textChannel.name}`);
            } else {
                console.log(`No suitable text channel found.`);
            }
            textChannel.send("Boss, you called?");
            const { id, name, memberCount } = guild;
            const guildId = id;
            const guildName = name;
            const guildUserCount = memberCount;
            const gainADAY = config.default_values.gainADAY;
            const searchADAY = config.default_values.searchADAY;
            const value = 0;
            const defaultChannelId = textChannelID;
            const exist = guildQuery.readOne(checkQuery);
            if (!exist) {
                const creationQuery = {
                    name: guildName,
                    id: guildId,
                    amountofUsers: guildUserCount,
                    gainADAY,
                    searchADAY,
                    version,
                    channelInformation: [
                        {
                            _id: textChannelID,
                            _type: "default",
                        },
                    ],
                    pro: false,
                };

                await guildQuery.insertOne(creationQuery);
                console.log(
                    `Guild ${guildName} (${guildId}) added to database.`
                );
            } else {
                console.log(
                    `Guild ${guildName} (${guildId}) already exists in database.`
                );
            }

            // Fetch all members in the guild
            guild.members.fetch().then(async (members) => {
                const userInsertions = members.map((member) => {
                    const userId = member.user.id;
                    const userName = member.user.username;
                    const userQueryData = {
                        _id: userId,
                        _guildId: guildId,
                        name: userName,
                    };
                    return userQuery.insertOne(userQueryData);
                });

                await Promise.all(userInsertions);
                console.log(
                    `All members of guild ${guildName} have been added to the userDataBase.`
                );
            });
        } catch (error) {
            console.error("Error executing guildCreate event:", error);
        }

        console.log(" ");
    },
};
