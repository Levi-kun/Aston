const { Client, Collection, GatewayIntentBits } = require('discord.js');

class MyClient extends Client {
    constructor(options) {
        super(options);
        this.commands = new Collection();
        this.cooldowns = new Collection(); // Assign the Collection here
        this.Events.randomServerSpawner = new Event()
    }
}

const client = new MyClient({ intents: [GatewayIntentBits.Guilds, "GuildVoiceStates", GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildMembers] });

module.exports = client;