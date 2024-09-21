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
const animedb = new sqlite3.Database("databases/animeDataBase.db")

// Promisify db methods for async/await usage
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));

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
                .setRequired(true)
        )
        .addUserOption((option) =>
            option
                .setName("user")
                .setDescription("Which user do you want to use?")
        ),
    async execute(interaction) {
        const cardName = interaction.options.getString("name").toLowerCase(); // Corrected 'options'
        const user = interaction.options.getUser("user") || interaction.user; // Default to command user if not provided

        try {
            // **1. Fetch the Card ID Based on the Card Name**
            const cardIDRow = await dbGetAsync(
                `SELECT id FROM animeCardList WHERE Name = ?`,
                [cardName]
            );

            if (!cardIDRow) {
                return interaction.reply({
                    content: `No card found with the name "${cardName}".`,
                    ephemeral: true,
                });
            }

            const cardID = cardIDRow.id;

            // **2. Fetch All Owned Cards for the User**
            // **Fixed SQL Query Syntax**: Added missing closing quotation mark (`"`)
            const query = `SELECT * FROM "${interaction.guild.id}_owned_Cards" WHERE player_id = ? AND card_id = ?`;
            const rows = await dbAllAsync(query, [user.id, cardID]);

            if (!rows || rows.length === 0) {
                return interaction.reply({
                    content: `${user.username} does not own any cards named "${cardName}".`,
                    ephemeral: true,
                });
            }

            // **3. Fetch Associated Photos**
            const photoQuery = `
                SELECT pictureData
                FROM animeCardPictures
                WHERE cardId = ?
            `;
            const photos = await dbAllAsync(photoQuery, [cardID]);

            // **4. Prepare the Carousel Data**
            let currentIndex = 0; // Starting index for the carousel

            // **5. Generate Embeds with Images**
            // Function to generate an embed for a given card and image
            const generateEmbed = (card, index, total, photoUrl) => {
                return new EmbedBuilder()
                    .setTitle(`Card: ${cardName}`) // Using cardName as per your data
                    .setDescription(
                        `**ID:** ${card.id}\n**Rank:** ${card.rank}\n**Power:** ${card.realPower}`
                    )
                    .setImage(photoUrl || "https://example.com/default-card-image.png") // Replace with your default image URL
                    .setFooter({ text: `Card ${index + 1} of ${total}` });
            };

            // **6. Initialize the Embed with the First Card and Photo**
            const initialPhoto =
                photos.length > 0 ? photos[0].pictureData : "https://example.com/default-card-image.png"; // Replace with your default image URL
            const embed = generateEmbed(rows[currentIndex], currentIndex, rows.length, initialPhoto);

            // **7. Create Navigation Buttons**
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

            // **8. Send the Initial Message with Embed and Buttons**
            const message = await interaction.reply({
                embeds: [embed],
                components: [actionRow],
                fetchReply: true,
            });

            // **9. Create a Collector to Handle Button Interactions**
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

                // **10. Update the Current Index Based on Button Clicked**
                if (i.customId === "left") {
                    currentIndex = currentIndex > 0 ? currentIndex - 1 : currentIndex;
                } else if (i.customId === "right") {
                    currentIndex = currentIndex < rows.length - 1 ? currentIndex + 1 : currentIndex;
                }

                // **12. Generate the New Embed**
                const newEmbed = generateEmbed(rows[currentIndex], currentIndex, rows.length, photos[0].pictureData);

                // **13. Update Button States**
                leftButton.setDisabled(currentIndex === 0);
                rightButton.setDisabled(currentIndex === rows.length - 1);
                const newActionRow = new ActionRowBuilder().addComponents(leftButton, rightButton);

                // **14. Edit the Original Message with the New Embed and Updated Buttons**
                await i.update({
                    embeds: [newEmbed],
                    components: [newActionRow],
                });
            });

            collector.on("end", () => {
                // **15. Disable Buttons After Collector Ends**
                leftButton.setDisabled(true);
                rightButton.setDisabled(true);
                const disabledRow = new ActionRowBuilder().addComponents(leftButton, rightButton);
                message.edit({ components: [disabledRow] }).catch(console.error);
            });
        } catch (e) {
            console.log(e)
        }
    },
};
