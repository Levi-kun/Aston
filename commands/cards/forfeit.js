// forfeit.js

const { Battle } = require("../../classes/cardManager.js");
const { SlashCommandBuilder } = require("discord.js");

module.exports = {
    category: "cards",
    cooldown: 30,
    data: new SlashCommandBuilder()
        .setName("forfeit")
        .setDescription("Boss, it's okay to lose."),
    async execute(interaction) {
        const { user, guild } = interaction;
        const loserId = user.id;
        const guildId = guild.id;

        try {
            // Retrieve and handle the battle
            const battle = await Battle.getOngoingBattle(guildId, loserId);
            if (!battle) {
                return interaction.reply({
                    content: "You are not currently in an ongoing battle!",
                    ephemeral: true,
                });
            }

            const { winner_id: winnerId } = await battle.forfeit(loserId);

            // Send notification messages
            const content = `<@${loserId}> has forfeited the game against <@${winnerId}>.`;
            await interaction.reply({ content, ephemeral: true });

            const battleChannel = await battle.getBattleChannel();
            if (battleChannel) {
                await battleChannel.send({
                    content: `<@${loserId}> has forfeited the battle. <@${winnerId}> wins by default!`,
                });
            }

            await battle.endBattle(winnerId);
        } catch (error) {
            console.error(`Error handling forfeit: ${error}`);
        }
    },
};
