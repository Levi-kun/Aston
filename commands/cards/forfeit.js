// forfeit.js

const { Battle, BattleStatus } = require("../../classes/battle.js");
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

		const { winner, battle } = await Battle.forfeit(guildId, loserId);
		try {
			if (battle === "No forfeit battle found.") {
				return interaction.reply({
					content: "You are not currently in an ongoing battle!",
					ephemeral: true,
				});
			}

			// Send notification messages
			const content = `<@${loserId}> has forfeited the game against <@${winner.id}>.`;
			await interaction.reply({ content, ephemeral: true });

			const battleChannel = await battle.getBattleChannel();
			if (Object.keys(battleChannel).length == 0) {
				await battleChannel.send({
					content: `<@${loserId}> has forfeited the battle. <@${winner.id}> wins by default!`,
				});
			}
		} catch (error) {
			console.error(`Error handling forfeit: ${error}`);
		}
	},
};
