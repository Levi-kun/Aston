const {
    SlashCommandBuilder,
    GuildOnboardingPromptOption,
} = require("discord.js");
const util = require("util");
const version = 1; // version header

// Promisify db methods

const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

module.exports = {
    category: "cards",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("inspect")
        .setDescription("inspects a card!")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("What's the card name?")
                .setRequired(true)
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("What user do you want to use?")
        ),
    async execute(interaction) {
        const cardName = interaction.option.getString("name");

        let query = `SELECT id FROM animeCardList WHERE Name = ?`;
        const cardID = dbGetAsync(query, [cardName]);

        query = `SELECT * FROM "${interaction.guild.id}_owned_Cards WHERE player_id = ?, card_id = ?"`;

        const rows = dbGetAsync(query, [interaction.user.id, cardID]);
        if (Array.isArray(rows)) {
            carosole = [];
            rows.forEach((card) => {
                carosole.push(rows);
                interaction.send(carosole[0]);
            });
        } else {
            interaction.send(rows.Name);
        }

        /* 
        create a table called owned_Cards_(guild id)
        SCHEMA:
        vr NOT NULL
        timestamp created NOT NULL
        id NOT NULL PRIMARY_KEY
        rank NOT NULL
        card_id NOT NULL
        player_id NOT NULL
        realPower
        move_ids
        inGroup
        */
    },
};

async function buttonCreater(message) {
    const left = new ButtonBuilder()
        .setCustomId("left")
        .setLabel("Claim this Card")
        .setStyle(ButtonStyle.Primary);
    const right = new ButtonBuilder()
        .setCustomId("right")
        .setLabel("Claim this Card")
        .setStyle(ButtonStyle.Primary);

    const row = new ActionRowBuilder().addComponents([left, right]);

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
        console.log(`Collected ${collected.size} interactions.`);
    });
}
