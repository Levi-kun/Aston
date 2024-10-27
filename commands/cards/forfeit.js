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
		if (interaction.channel.type === "dm")
			return interaction.reply({
				content:
					"This command can only be used in a Discord server. ^ check where the challenge came from!",
			});
		const loserId = user.id;
		const guildId = guild.id;

		const { battle, Error } = await Battle.forfeit(guildId, loserId);
		const winner = battle.getWinner();
		if (Error === 1) {
			return interaction.reply({
				content: "You are not currently in a battle, boss.",
			});
		}
		try {
			console.log(winner, battle, loserId);
			// Send notification messages
			const content = `<@${loserId}> has forfeited the game against <@${winner}>.`;
			await interaction.reply({ content, ephemeral: true });

			const battleChannel = await guild.channels.fetch(
				battle.getBattleChannel()
			);
			if (battleChannel) {
				await battleChannel.send({
					content: `<@${loserId}> has forfeited the battle. <@${winner}> wins by default!`,
				});
			}
		} catch (error) {
			console.error(`Error handling forfeit: ${error}`);
		}
	},
};
