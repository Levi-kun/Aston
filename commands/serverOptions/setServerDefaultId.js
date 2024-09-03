const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const sqlite3 = require('sqlite3')
const db = new sqlite3.Database("databases/animeDataBase.db");
const util = require("util");
const dbRunAsync = util.promisify(db.run.bind(db));
async function updateChannelId(guildId, channelId) {
    try {
  
      await dbRunAsync(`UPDATE guildTable
      SET defaultChannelId = ?
      WHERE guildID = ?;`, [channelId, guildId]);
    
    } catch (error) {
        console.error("Error:", error.message);
    }
    
  }

module.exports = {
	category:'server',
	cooldown: 5,
	data: new SlashCommandBuilder()
		.setName('defaultchannel')
		.setDescription('Wanna change the default channel?')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
        .addChannelOption(option => 
            option
            .setName('channel')
            .setDescription('Which channel, boss?')
            .setRequired(true)
        ),
	async execute(interaction) {
        const channelId = interaction.options.getChannel('channel')
        updateChannelId(interaction.guild.id, channelId.id)
        interaction.reply(`${interaction.member.displayName} the ${channelId} is the new default channel!`)
    },
};