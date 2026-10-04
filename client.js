const { Client, Collection, GatewayIntentBits } = require("discord.js");

/**
 *  This file creates and exports the discord Client Object
 */

class MyClient extends Client {
	constructor(options) {
		super(options);
		this.commands = new Collection();
		this.cooldowns = new Collection(); // Assign the Collection here
	}
}

const client = new MyClient({
	intents: [
		GatewayIntentBits.Guilds,
		"GuildVoiceStates",
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.DirectMessages,
	],
});

module.exports = client;
