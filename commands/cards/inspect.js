const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
    ComponentType,
} = require("discord.js");
const util = require("util");
const sqlite3 = require("sqlite3");

// Initialize and connect to the SQLite database
const animedb = new sqlite3.Database("databases/animeDataBase.db");

// Promisify db methods for async/await usage
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

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

module.exports = {
    category: "cards",
    cooldown: 10,
    data: new SlashCommandBuilder()
        .setName("inspect")
        .setDescription("Inspects a card!")
        .addStringOption((option) =>
            option
                .setName("name")
                .setDescription("What's the card name?")
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Which user do you want to use?")
        ),
    async execute(interaction) {
        const cardName = interaction.options.getString("name")?.toLowerCase(); // Optional chaining for safety
        const user = interaction.options.getUser("user") || interaction.user;

        try {
            if (!cardName) {
                // **1. Fetch All Cards Owned by the User**
                const query = `SELECT acl.id AS card_id, acl.Name, oc.rank, oc.realPower 
                               FROM "${interaction.guild.id}_owned_Cards" oc
                               JOIN animeCardList acl ON oc.card_id = acl.id
                               WHERE oc.player_id = ?`;
                const userCards = await dbAllAsync(query, [user.id]);

                if (!userCards || userCards.length === 0) {
                    return interaction.reply({
                        content: `${user.username} does not own any cards.`,
                        ephemeral: true,
                    });
                }

                // **2. Fetch All Photos for the User's Cards**
                const cardIds = userCards.map(card => card.card_id);
                const placeholders = cardIds.map(() => '?').join(',');
                const photoQuery = `
                    SELECT cardId, pictureData 
                    FROM animeCardPictures 
                    WHERE cardId IN (${placeholders})
                `;
                const photos = await dbAllAsync(photoQuery, cardIds);

                // **3. Assign Photos to Each Card**
                const cardPhotosMap = {};
                photos.forEach(photo => {
                    if (!cardPhotosMap[photo.cardId]) {
                        cardPhotosMap[photo.cardId] = [];
                    }
                    cardPhotosMap[photo.cardId].push(photo.pictureData);
                });

                userCards.forEach(card => {
                    card.pictures = cardPhotosMap[card.card_id] || [];
                });

                let currentIndex = 0;

                // **4. Generate Embeds for Each Card Including Images**
                const generateEmbed = (card, index, total) => {
                    const firstPhoto = card.pictures.length > 0 ? card.pictures[0] : "https://example.com/default-card-image.png"; // Replace with your default image URL
                    return new EmbedBuilder()
                        .setTitle(`Card: ${card.Name}`)
                        .setDescription(
                            `**ID:** ${card.card_id}\n**Rank:** ${rarityDesignater(card.rank)}\n**Power:** ${card.realPower}`
                        )
                        .setImage(firstPhoto) // Display the first photo
                        .setFooter({ text: `Card ${index + 1} of ${total}` });
                };

                const embed = generateEmbed(userCards[currentIndex], currentIndex, userCards.length);

                // **5. Create Navigation Buttons**
                const leftButton = new ButtonBuilder()
                    .setCustomId("left")
                    .setLabel("◀️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true);

                const rightButton = new ButtonBuilder()
                    .setCustomId("right")
                    .setLabel("▶️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(userCards.length === 1);

                const inspectButton = new ButtonBuilder()
                    .setCustomId("inspect")
                    .setLabel("🔍")
                    .setStyle(ButtonStyle.Success);

                const actionRow = new ActionRowBuilder().addComponents(leftButton, rightButton, inspectButton);

                // **6. Send Initial Embed with Buttons**
                const message = await interaction.reply({
                    embeds: [embed],
                    components: [actionRow],
                    fetchReply: true,
                });

                // **7. Handle Button Interactions**
                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 600000, // 10 minutes
                });

                collector.on("collect", async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({
                            content: "You cannot interact with these buttons.",
                            ephemeral: true,
                        });
                    }

                    if (i.customId === "left") {
                        currentIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
                    } else if (i.customId === "right") {
                        currentIndex = currentIndex < userCards.length - 1 ? currentIndex + 1 : currentIndex;
                    } else if (i.customId === "inspect") {
                        // **8. Inspect Card Without Photos**
                        const card = userCards[currentIndex];
                        const inspectEmbed = new EmbedBuilder()
                            .setTitle(`Inspecting Card: ${card.Name}`)
                            .setDescription(
                                `**ID:** ${card.card_id}\n**Rarity:** ${rarityDesignater(card.rank)}\n**Power:** ${card.realPower}\n**Other Details...**`
                            )
                            .setFooter({ text: `Inspected by ${interaction.user.username}` });

                        return i.reply({ embeds: [inspectEmbed], ephemeral: true });
                    }

                    // **9. Generate the New Embed with Updated Index**
                    const newEmbed = generateEmbed(userCards[currentIndex], currentIndex, userCards.length);

                    // **10. Update Button States**
                    leftButton.setDisabled(currentIndex === 0);
                    rightButton.setDisabled(currentIndex === userCards.length - 1);

                    const newActionRow = new ActionRowBuilder().addComponents(leftButton, rightButton, inspectButton);

                    // **11. Edit the Original Message with the New Embed and Updated Buttons**
                    await i.update({
                        embeds: [newEmbed],
                        components: [newActionRow],
                    });
                });

                collector.on("end", () => {
                    // **12. Disable Buttons After Collector Ends**
                    leftButton.setDisabled(true);
                    rightButton.setDisabled(true);
                    inspectButton.setDisabled(true);
                    const disabledRow = new ActionRowBuilder().addComponents(leftButton, rightButton, inspectButton);
                    message.edit({ components: [disabledRow] }).catch(console.error);
                });
            } else {
                // **13. Existing Card Inspection Logic with Photos (If Needed)**
                // If you want to handle inspecting a specific card by name, you can include the photo fetching here as well.
                // Below is an example implementation:

                // **a. Fetch the Card ID Based on the Card Name**
                const cardIDRow = await dbGetAsync(
                    `SELECT id FROM animeCardList WHERE LOWER(Name) = ?`,
                    [cardName]
                );

                if (!cardIDRow) {
                    return interaction.reply({
                        content: `No card found with the name "${cardName}".`,
                        ephemeral: true,
                    });
                }

                const cardID = cardIDRow.id;

                // **b. Fetch the User's Owned Cards with the Specified Name**
                const query = `SELECT * FROM "${interaction.guild.id}_owned_Cards" WHERE player_id = ? AND card_id = ?`;
                const rows = await dbAllAsync(query, [user.id, cardID]);

                if (!rows || rows.length === 0) {
                    return interaction.reply({
                        content: `${user.username} does not own any cards named "${cardName}".`,
                        ephemeral: true,
                    });
                }

                // **c. Fetch Associated Photos**
                const photoRow = await dbAllAsync(
                    `SELECT pictureData FROM animeCardPictures WHERE cardId = ?`,
                    [cardID]
                );

                const photos = photoRow.map(photo => photo.pictureData);

                // **d. Prepare the Carousel Data**
                let currentIndex = 0; // Starting index for the carousel

                // **e. Generate Embeds with Images**
                const generateEmbedSpecific = (card, index, total, photoUrl) => {
                    return new EmbedBuilder()
                        .setTitle(`Card: ${cardName}`)
                        .setDescription(
                            `**ID:** ${card.id}\n**Rarity:** ${rarityDesignater(card.rank)}\n**Power:** ${card.realPower}`
                        )
                        .setImage(photoUrl || "https://example.com/default-card-image.png") // Replace with your default image URL
                        .setFooter({ text: `Card ${index + 1} of ${total}` });
                };

                const embed = generateEmbedSpecific(rows[currentIndex], currentIndex, rows.length, photos[0]);

                // **f. Create Navigation Buttons**
                const leftButton = new ButtonBuilder()
                    .setCustomId("left")
                    .setLabel("◀️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(true); // Initially disabled since we're at the first card

                const rightButton = new ButtonBuilder()
                    .setCustomId("right")
                    .setLabel("▶️")
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(rows.length === 1); // Disabled if only one card

                const actionRow = new ActionRowBuilder().addComponents(leftButton, rightButton);

                // **g. Send the Initial Message with Embed and Buttons**
                const message = await interaction.reply({
                    embeds: [embed],
                    components: [actionRow],
                    fetchReply: true,
                });

                // **h. Create a Collector to Handle Button Interactions**
                const collector = message.createMessageComponentCollector({
                    componentType: ComponentType.Button,
                    time: 600000, // 10 minutes
                });

                collector.on("collect", async (i) => {
                    if (i.user.id !== interaction.user.id) {
                        return i.reply({
                            content: "You cannot interact with these buttons.",
                            ephemeral: true,
                        });
                    }

                    // **i. Update the Current Index Based on Button Clicked**
                    if (i.customId === "left") {
                        currentIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
                    } else if (i.customId === "right") {
                        currentIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : currentIndex;
                    }

                    // **j. Generate the New Embed**
                    const newEmbed = generateEmbedSpecific(rows[currentIndex], currentIndex, rows.length, photos[currentIndex] || "https://example.com/default-card-image.png");

                    // **k. Update Button States**
                    leftButton.setDisabled(currentIndex === 0);
                    rightButton.setDisabled(currentIndex === rows.length - 1);
                    const newActionRow = new ActionRowBuilder().addComponents(leftButton, rightButton);

                    // **l. Edit the Original Message with the New Embed and Updated Buttons**
                    await i.update({
                        embeds: [newEmbed],
                        components: [newActionRow],
                    });
                });

                collector.on("end", () => {
                    // **m. Disable Buttons After Collector Ends**
                    leftButton.setDisabled(true);
                    rightButton.setDisabled(true);
                    const disabledRow = new ActionRowBuilder().addComponents(leftButton, rightButton);
                    message.edit({ components: [disabledRow] }).catch(console.error);
                });
            }
        } catch (e) {
            console.error(e);
            return interaction.reply({
                content: "An error occurred while trying to inspect the card.",
                ephemeral: true,
            });
        }
    },
};
