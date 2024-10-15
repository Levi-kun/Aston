const {
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
    ActionRowBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js");
const eventEmitter = require("../src/eventManager");
const { ObjectId } = require("mongodb");
const version = 1; // version header

function capitalizeFirstLetter(str) {
    return str
        .split(" ")
        .map((word) => {
            for (let i = 0; i < word.length; i++) {
                if (/[a-zA-Z]/.test(word.charAt(i))) {
                    return (
                        word.slice(0, i) +
                        word.charAt(i).toUpperCase() +
                        word.slice(i + 1)
                    );
                }
            }
            return word; // If no alphabetical characters, return the word as is
        })
        .join(" ");
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
    const query = new Query("ownedCards");

    let power;
    if (card.Value >= 4) {
        power = Math.floor(card.Value * getRandomMultiplier(0.9, 1.111));
    } else {
        power = Math.floor(card.Value * getRandomMultiplier(0.8, 1.199));
    }

    try {
        const rowData = await query.insertOne({
            vr: version,
            rank: card.Rarity,
            player_id: user._id,
            guild_id: guild.id,
            realPower: power,
            move_ids: moveId,
        });
        return rowData;
    } catch (err) {
        console.error(`Error inserting into ownedCards: ${err.message}`);
        throw err; // Re-throw the error after logging
    }
}

// Helper function
function getRandomMultiplier(min, max) {
    return min + Math.random() * (max - min);
}

async function grabCardMoves(_id) {
    const query = new Query("animeCardMoves");

    let rows = await query.readOne({ "parent.id": new ObjectId(imageId) });

    if (!rows || rows.length === 0) {
        rows = await query.readMany({ cardId: 0 });
    }

    // Ensure rows is always an array
    if (!Array.isArray(rows)) {
        rows = [rows];
    }

    // Extract the '_id' from each row
    const rowIds = rows.map((row) => String(row.card._id));

    return rowIds.join(",");
}

async function messageCreater(image, card, defaultChannel, link, guild) {
    console.log(image);
    const claimButton = new ButtonBuilder()
        .setCustomId("Claim")
        .setLabel("Claim this Card")
        .setStyle(ButtonStyle.Primary);
    const cardEmbed = new EmbedBuilder()
        .setColor("000000")
        .setImage(`${image}`)
        .setDescription(`${capitalizeFirstLetter(card.name)}`)
        .addFields(
            { name: "Value", value: `${card.power}` },
            {
                name: "Rarity",
                value: `${rarityDesignater(card.rarity)}`,
                inline: true,
            }
        );

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
                    await grabCardMoves(card._id),
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
            const query = new Query("animeCardList");

            let card = await query.aggregate(1);

            if (!card) {
                console.error("Card not found");
                return;
            }
            card = card[0];
            // Get the default channel ID
            const guildQuery = new Query("guildDataBase");
            const guildData = await guildQuery.readOne({ id: guild.id });

            if (!guildData) {
                console.error("Guild data not found", guild.id, guild.name);
                return;
            }

            const defaultChannelId = guildData.channelInformation.default._id;
            const cardIdQuery = {
                card_id: new ObjectId(card._id),
            };

            const photoQuery = new Query("animeCardPhotos");
            const photos = await photoQuery.readMany(cardIdQuery);

            if (!photos) {
                return console.log(`Broski ${card._id} still has no images`);
            }
            const image = photos.map((photo) => photo.attachment);
            const link = photos.map(
                (photo) => photo.linkAttachment || "@asp_levi"
            );

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
