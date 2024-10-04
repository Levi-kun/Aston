const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { Query } = require("../../databases/query.js");

// Create a new instance of the Query class for the guildDataBase
const guildQuery = new Query("guildDataBase");

async function updateChannelId(guildId, channelId) {
    try {
        // Connect to the database
        await guildQuery.connect();

        // Prepare the update data
        const updateData = {
            channelInformation: [
                { _id: channelId, _type: "default" }, // Add channel with type as 'default'
            ],
        };

        // Update the guild document with the new channel information
        const result = await guildQuery.updateOne({ id: guildId }, updateData);
        if (result.modifiedCount === 0) {
            throw new Error("No document was updated.");
        }
    } catch (error) {
        console.error("Error updating channel ID:", error.message);
    }
}

module.exports = {
    category: "server",
    cooldown: 5,
    data: new SlashCommandBuilder()
        .setName("defaultchannel")
        .setDescription("Wanna change the default channel?")
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(
            (option) =>
                option
                    .setName("channel")
                    .setDescription("Which channel, boss?")
                    .setRequired(true) // Channel is required
        ),
    async execute(interaction) {
        const channelId = interaction.options.getChannel("channel");

        if (channelId) {
            await updateChannelId(interaction.guild.id, channelId.id);
            await interaction.reply({
                content: `${interaction.member.displayName}, ${channelId} is now the new default channel!`,
                ephemeral: true,
            });
        } else {
            await interaction.reply("Boss, something went wrong...");
        }
    },
};
