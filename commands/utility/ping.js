const { SlashCommandBuilder, MessageFlags } = require("discord.js");
/**
 * 
 *  Ping command! Typical ping calculation!
 * 
 */
module.exports = {
    category: "utility",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("ping")
        .setDescription("Replies with Pong!"),
    async execute(interaction) {
        const startedAt = Date.now();
        await interaction.deferReply({ flags: MessageFlags.Ephemeral });
        const responseTime = Date.now() - startedAt;
        await interaction.editReply(
            `Pong 🏓  *ping: ${responseTime}ms!*`
        );
    },
};
