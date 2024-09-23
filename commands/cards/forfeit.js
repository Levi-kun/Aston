
const { Battle, Card } = require("../../classes/cardManager.js"); 

const {
    SlashCommandBuilder
} = require("discord.js");

module.exports = {
    category: "cards",
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName("forfeit")
        .setDescription("Boss, it's okay to lose.")
        .setDMPermission(false),
    async execute(interaction) {
        const loserId = interaction.user.id;
        const guildId = interaction.guild.id;

        try {
            // Retrieve the ongoing battle involving the user
            const battle = await Battle.getOngoingBattle(guildId, loserId);

            if (!battle) {
                return interaction.reply({
                    content: "You are not currently in an ongoing battle!",
                    ephemeral: true,
                });
            }

            // Handle the forfeit
            const { winnerId } = await battle.forfeit(loserId);

            // Optionally, you can add logic here to notify the winner, update rankings, etc.

            return interaction.reply({
                content: `<@${loserId}> has forfeited the game against <@${winnerId}>.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`Error handling forfeit: ${error}`);
            return interaction.reply({
                content: "An error occurred while processing your forfeit.",
                ephemeral: true,
            });
        }
    },
};
