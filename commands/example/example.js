const { SlashCommandBuilder } = require("discord.js");
/**
 * 
 *  Example Command, help understand how discord.js expects messages to be sent!
 * 
 */
module.exports = {
    category: "example",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("commandsmustbelowercaseandnospaces")
        .setDescription("This Describes the command!"), // for more factory (dot) functions look at discord.js.org documentation!
    async execute(interaction) {
        const sent = await interaction.deferReply({ // This is a Reply, a defered Reply, meaning it *will be edited later*
            content: `Hi!`,
            fetchReply: true,
            ephemeral: true,
        });
        await interaction.editReply(`Hello!`); // Here is the edited Reply!
        interaction.reply()
        /**
         * 
         * for a normal reply do interaction.reply()
         * inside the () requires an {} object!
         * {} requires a content: `Text here!`
         * ephemeral makes it so *only* the user sees it!
         * 
         */
        
    },
};
