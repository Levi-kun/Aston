const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");
module.exports = {
    category: "admin",
    data: new SlashCommandBuilder()
        .setName("playermoveevents")
        .setDescription("Emits the GuildCreate event")
        .addStringOption((option) =>
            option
                .setName("joinorleave")
                .setDescription("You want to test Joining or Leaving boss?")
                .setRequired(true)
                .addChoices(
                    { name: "Join", value: "A fresh face around here." },
                    {
                        name: "Leave",
                        value: `I know your just kidding boss, but your not actually leaving, right?`,
                    }
                )
        ),
    async execute(interaction) {
        const inOurOut = interaction.options.getString("joinorleave");
        if (!interaction.user.id === ownerId) return;
        // Emit the GuildCreate event
        if (inOurOut === "Join") {
            interaction.client.emit("guildMemberAdd", interaction.member);
        } else if (inOurOut === "Leave") {
            interaction.client.emit("guildMemberRemove", interaction.member);
        }

        await interaction.reply(`${interaction.user.username} has moved!`);
    },
};
