const { Client, GatewayIntentBits } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const animedb = new sqlite3.Database("databases/animeDataBase.db");
const eventEmitter = require("../src/eventManager");
const util = require("util");

// Promisify db methods
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

module.exports = {
    name: 'spawnInCard',
    async execute(guild) {
        try {
            // Get all card IDs
            const cardIDRows = await dbAllAsync(`SELECT id FROM "${guild.id}_cards"`);
            const cardIDArray = cardIDRows.map(row => row.id);

            if (cardIDArray.length === 0) {
                console.error("No card IDs found");
                return;
            }

            // Select a random card ID
            const randomID = cardIDArray[Math.floor(Math.random() * cardIDArray.length)];
            console.log(`Selected card ID: ${randomID}`);

            // Get the card details
            const card = await dbGetAsync(`SELECT * FROM "${guild.id}_cards" WHERE id = ?`, [randomID]);

            if (!card) {
                console.error("Card not found");
                return;
            }

            // Get the default channel ID
            const guildData = await dbGetAsync(`SELECT defaultChannelId FROM guildTable WHERE guildID = ?`, [guild.id]);

            if (!guildData) {
                console.error("Guild data not found");
                return;
            }

            const defaultChannelId = guildData.defaultChannelId;
            console.log(`Retrieved defaultChannelId: ${defaultChannelId}`);

            // Send messages to the default channel
            const defaultChannel = guild.channels.cache.get(defaultChannelId);
            if (defaultChannel) {
                await defaultChannel.send("Click the button to claim");
                await defaultChannel.send(card.Name);
            } else {
                console.error("Default channel not found");
            }
        } catch (err) {
            console.error(`Error executing spawnInCard: ${err.message}`);
        }
    }
};

// Listen for the 'spawnInCard' event
eventEmitter.on('spawnInCard', (guild) => {
    module.exports.execute(guild);
});
