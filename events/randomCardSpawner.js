const { GatewayIntentBits, ButtonBuilder, ButtonStyle, EmbedBuilder, ActionRowBuilder } = require("discord.js");
const sqlite3 = require("sqlite3").verbose();
const animedb = new sqlite3.Database("databases/animeDataBase.db");
const eventEmitter = require("../src/eventManager");
const util = require("util");
const { timeStamp } = require("console");

const version = 1

// Promisify db methods
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}

function powerToMultiplier (integer){
    let power = 0
    power=integer/100
}

function rarityDesignater(rarity){
    let value = "D"
    if(rarity <= 2) {
        value = "C"
    } else if(rarity <= 3) {
        value = "B"
    } else if(rarity <=4){
        value = "A"

    } else if(rarity <=5){
        value = "S+"
    }
    return value
}

function addToPlayer (user, card, moveId, guild) {
    let row = `INSERT INTO owned_Cards${guild.id}  (id, vr, rank, card_id, player_id, realPower,move_ids)`
    let power;
    if(card.power>=4){
        power = math.floor(card.power*Math.random(0.9,1.111))
    } else {
        power = math.floor(card.power*Math.random(0.8,1.199))
    }

    const rowData = animedb.dbAllAsync(row, [version, card.rank, card.id, user.id, power, moveId])

}

function grabCardMoves (id) {

    let row = `SELECT * card_moves WHERE id = ? VALUES (${id})`

    const moves = animedb.dbGetAsync(row)

    let rowId = []

    moves.map((row) => {

        rowId.push(row.id);

    })

    return rowId

};

async function messageCreater (image, card, defaultChannel,link) {

    const claimButton = new ButtonBuilder()
    .setCustomId('Claim')
    .setLabel('Claim this Card')
    .setStyle(ButtonStyle.Primary);
    console.log(card)
    const cardEmbed = new EmbedBuilder()
    .setColor("000000")
    .setImage(`${image}`)
    .setDescription(`[${capitalizeFirstLetter(card.Name)}](${link})`)
    .addFields(
		{ name: 'Value', value: `${card.Value}`},
		{ name: 'Rarity', value: `${rarityDesignater(card.Rarity)}`, inline: true});
     //.setFooter({                           plan on making a database
       // text: `${timeStamp}`}); 




    /*

        Just planning on what i want to happen next:

        A) the card is assign power and moves.

        create a table called owned_Cards_(guild id)
        SCHEMA:
        vr
        id
        rank
        card_id
        player_id
        realPower
        move_ids



        B) the player get's the card in their server row.
        C) the card deletes itself.
        

    */

    const row = new ActionRowBuilder()
    .addComponents(claimButton);

    let message = await defaultChannel.send({embeds: [cardEmbed], components: [row]});
    const confirmation = await response.awaitMessageComponent({ filter: collectorFilter, time: 600_000 });

    const nextCollectorFilter = (i) =>
        i.user.id === interaction.user.id && i.customId === "next";
            if (confirmation.customId === "Claim") { 

                message.delete()

                addToPlayer(i.user,card,grabCardMoves(card.id),guild)
                message.channel.send(`${user.name}, congrats on obtaining: ${card.name}`)


            }

}

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

            const photoQuery = `
            SELECT pictureData, link
            FROM animeCardPictures
            WHERE cardId = ?
        `;
        const photos = await dbAllAsync(photoQuery, [card.id]);
        
        if (!photos) {
            return console.log(`Broski ${card.id} still has no images`);
        }
        
        const image = photos.map((photo) => photo.pictureData);
        const link = photos.map((photo) => photo.link || 'google.com');
        
        
            
            // Send messages to the default channel
            const defaultChannel = guild.channels.cache.get(defaultChannelId);
            if (defaultChannel) {
                messageCreater(image[0],card,defaultChannel,link[0])
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