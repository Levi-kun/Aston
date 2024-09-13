const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const sqlite3 = require("sqlite3");
const db = new sqlite3.Database("databases/animeDataBase.db");
const util = require("util");

// Promisify the required db methods
const dbAllAsync = util.promisify(db.all.bind(db));
const dbRunAsync = util.promisify(db.run.bind(db));

async function updateChannelId(guildId, channelId) {
    try {
        await dbRunAsync(
            `UPDATE guildTable
        SET defaultChannelId = ?
        WHERE guildID = ?;`,
            [channelId, guildId]
        );
    } catch (error) {
        console.error("Error updating channel ID:", error.message);
    }
}

async function fetchChannelId(guildId) {
    try {
        const query = `SELECT defaultChannelId FROM guildTable
        WHERE guildID = ?;`;
        const rows = await dbAllAsync(query, [guildId]);

        if (rows.length > 0) {
            return rows[0].defaultChannelId;
        } else {
            return "No default channel ID found.";
        }
    } catch (error) {
        console.error("Error fetching channel ID:", error.message);
        return "An error occurred while fetching the default channel ID.";
    }
}

module.exports = {
    category: "server",
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("defaultchannel")
        .setDescription("Wanna change the default channel?")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)

        .addBooleanOption(
            (option) =>
                option
                    .setName("fetchid")
                    .setDescription("Fetches the current default ID")
                    .setRequired(true) // Make fetchid required
        )
        .addChannelOption(
            (option) =>
                option
                    .setName("channel")
                    .setDescription("Which channel, boss?")
                    .setRequired(false) // Channel is optional if fetchid is provided
        ),
    async execute(interaction) {
        const booleanOption = interaction.options.getBoolean("fetchid");
        const channelId = interaction.options.getChannel("channel");

        if (!booleanOption && channelId) {
            await updateChannelId(interaction.guild.id, channelId.id);
            await interaction.reply(
                `${interaction.member.displayName}, ${channelId} is now the new default channel!`
            );
        } else if (booleanOption) {
            const currentChannelId = await fetchChannelId(interaction.guild.id);
            await interaction.reply(
                `The current default channel ID is: ${currentChannelId}`
            );
        } else {
            await interaction.reply(
                "You need to specify a channel to set or choose fetchid to retrieve the current ID."
            );
        }
    },
};
