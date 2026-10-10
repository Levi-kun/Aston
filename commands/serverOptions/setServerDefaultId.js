const { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } = require("discord.js");

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
            await interaction.reply({
                content: `${interaction.member.displayName}, saving the default channel is unavailable until the database migration is complete.`,
                flags: MessageFlags.Ephemeral,
            });
            /*
            //** TO DO! CONTACTED DATABASE WITH { collection: "guildDataBase", operation: "updateChannelId", args: [interaction.guild.id, channelId.id] } INFORMATION.
            RECREATE THIS IN DB,

            -- WARN! -- THIS WAS DONE BY AN AI AGENT -- WARN! --

            */
        } else {
            await interaction.reply("Boss, something went wrong...");
        }
    },
};
