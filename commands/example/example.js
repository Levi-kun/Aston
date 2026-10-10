const { SlashCommandBuilder, MessageFlags } = require("discord.js");
/**
 * 
 *  Example Command, help understand how discord.js expects messages to be sent!
 * 
 */
module.exports = {
    category: "example",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("cmdmustbelowercase")
        .setDescription("This Describes the command!"), // for more factory (dot) functions look at discord.js.org documentation!
    async execute(interaction) {
        await interaction.deferReply({ // This is a Reply, a defered Reply, meaning it *will be edited later*
            flags: MessageFlags.Ephemeral,
        });
        await interaction.editReply(`Hello!`); // Here is the edited Reply!
        /**
         * 
         * for a normal reply do interaction.reply()
         * inside the () requires an {} object!
         * {} requires a content: `Text here!`
         * MessageFlags.Ephemeral makes it so *only* the user sees it!
         * 
         */
        
    },
};
