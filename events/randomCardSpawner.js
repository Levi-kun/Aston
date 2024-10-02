const {
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ActionRowBuilder,
} = require("discord.js");
const sqlite3 = require("sqlite3");
const animedb = new sqlite3.Database("databases/animeDataBase.db");
const eventEmitter = require("../src/eventManager");
const util = require("util");
const { timeStamp } = require("console");

const version = 1; // version header

// Promisify db methods
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function rarityDesignater(rarity) {
    let value = "C";
    if (rarity <= 2) {
        value = "B";
    } else if (rarity <= 3) {
        value = "A";
    } else if (rarity <= 4) {
        value = "S";
    } else if (rarity <= 5) {
        value = "S+";
    }
    return value;
}

async function addToPlayer(user, card, moveId, guild) {
    const query = `INSERT INTO "${guild.id}_owned_Cards" (vr, rank, card_id, player_id, realPower, move_ids) VALUES (?, ?, ?, ?, ?, ?)`;

    let power;
    if (card.Value >= 4) {
        power = Math.floor(card.Value * getRandomMultiplier(0.9, 1.111));
    } else {
        power = Math.floor(card.Value * getRandomMultiplier(0.8, 1.199));
    }

    try {
        const rowData = await dbAllAsync(query, [
            version,
            card.Rarity,
            card.id,
            user.id,
            power,
            moveId,
        ]);
        return rowData;
    } catch (err) {
        console.error(
            `Error inserting into ${guild.id}_owned_Cards: ${err.message}`
        );
        throw err; // Re-throw the error after logging
    }
}

// Helper function
function getRandomMultiplier(min, max) {
    return min + Math.random() * (max - min);
}

async function grabCardMoves(id) {
    const query = `SELECT * FROM animeCardMoves WHERE cardId = ?`;
    let rows = await dbAllAsync(query, [id]);

    if (!rows || rows.length === 0) {
        rows = await dbAllAsync(query, [0]);
    }

    // Ensure rows is always an array
    if (!Array.isArray(rows)) {
        rows = [rows];
    }

    // Extract the 'id' from each row
    const rowIds = rows.map((row) => String(row.cardId));

    return rowIds.join(",");
}

async function messageCreater(image, card, defaultChannel, link, guild) {
    const claimButton = new ButtonBuilder()
        .setCustomId("Claim")
        .setLabel("Claim this Card")
        .setStyle(ButtonStyle.Primary);
    const cardEmbed = new EmbedBuilder()
        .setColor("000000")
        .setImage(`${image}`)
        .setDescription(`[${capitalizeFirstLetter(card.Name)}](${link})`)
        .addFields(
            { name: "Value", value: `${card.Value}` },
            {
                name: "Rarity",
                value: `${rarityDesignater(card.Rarity)}`,
                inline: true,
            }
        );
    //.setFooter({                           plan on making a database
    // text: `${timeStamp}`});

    /*


        so basically we should use node-schedule

        CREATE TABLE IF NOT EXISTS server_settings (
    guild_id TEXT PRIMARY KEY,
    day_id,
    numbersDaily INTEGER DEFAULT 10,
    cardsToday INTEGER DEFAULT 0,
    lastReset TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


    */

    const row = new ActionRowBuilder().addComponents(claimButton);

    let message = await defaultChannel.send({
        embeds: [cardEmbed],
        components: [row],
    });

    const collectorFilter = (i) =>
        i.customId === "next" || i.customId === "Claim";

    const collector = message.createMessageComponentCollector({
        filter: collectorFilter,
        time: 600_000,
    });

    collector.on("collect", async (i) => {
        if (i.customId === "Claim") {
            await message.delete();

            try {
                await addToPlayer(
                    i.user,
                    card,
                    await grabCardMoves(card.id),
                    guild
                );
                await message.channel.send(
                    `${i.user.username}, congrats on obtaining: ${card.Name}`
                );
            } catch (err) {
                console.error(`Error in addToPlayer: ${err.message}`);
                await message.channel.send(
                    `Sorry ${i.user.username}, there was an error claiming the card. Please try again later.`
                );
            }
        }
    });

    collector.on("end", (collected) => {
        message.delete();
        console.log(`Collected ${collected.size} interactions.`);
    });
}

module.exports = {
    name: "spawnInCard",
    async execute(guild) {
        try {
            // Get all card IDs
            const cardIDRows = await dbAllAsync(
                `SELECT id FROM "animeCardList"`
            );
            const cardIDArray = cardIDRows.map((row) => row.id);

            if (cardIDArray.length === 0) {
                console.error("No card IDs found");
                return;
            }

            // Select a random card ID
            const randomID =
                cardIDArray[Math.floor(Math.random() * cardIDArray.length)];
            console.log(`Selected card ID: ${randomID}`);

            // Get the card details
            const card = await dbGetAsync(
                `SELECT * FROM "animeCardList" WHERE id = ?`,
                [randomID]
            );

            if (!card) {
                console.error("Card not found");
                return;
            }

            // Get the default channel ID
            const guildData = await dbGetAsync(
                `SELECT defaultChannelId FROM guildTable WHERE guildID = ?`,
                [guild.id]
            );

            if (!guildData) {
                console.error("Guild data not found", guild.id, guild.name);
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
            const link = photos.map((photo) => photo.link || "google.com");

            // Send messages to the default channel
            const defaultChannel = guild.channels.cache.get(defaultChannelId);
            if (defaultChannel) {
                await messageCreater(
                    image[0],
                    card,
                    defaultChannel,
                    link[0],
                    guild
                );
            } else {
                console.error("Default channel not found");
            }
        } catch (err) {
            console.error(`Error executing spawnInCard: ${err.message}`);
        }
    },
};

// Listen for the 'spawnInCard' event
eventEmitter.on("spawnInCard", (guild) => {
    module.exports.execute(guild);
});
