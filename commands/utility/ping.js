const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  category: "utility",
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Replies with Pong!"),
  async execute(interaction) {
    const sent = await interaction.deferReply({
      content: `Ping 🏓!`,
      fetchReply: true,
      ephemeral: true,
    });
    await interaction.editReply(
      `Pong 🏓  *ping: ${Math.round(
        sent.createdTimestamp - interaction.createdTimestamp
      )}ms!*`
    );
  },
};
