const { SlashCommandBuilder, PermissionFlagsBits } = require("discord.js");
const { Query } = require("../../databases/query.js");

const guildQuery = new Query("guildDataBase");

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
            await guildQuery.updateChannelId(
                interaction.guild.id,
                channelId.id
            );
            await interaction.reply({
                content: `${interaction.member.displayName}, ${channelId} is now the new default channel!`,
                ephemeral: true,
            });
        } else {
            await interaction.reply("Boss, something went wrong...");
        }
    },
};
