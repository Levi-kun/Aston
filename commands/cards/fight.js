const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Battle, BattleStatus } = require("../../classes/battle.js");
const { Card } = require("../../classes/cardManager.js");
const { Query } = require("../../databases/query.js"); // Path to your Query class

const requiredCards = 4;
const pvpBattleCollectionName = "pvpBattles"; // Your pvpBattles collection name

module.exports = {
    category: "cards",
    data: new SlashCommandBuilder()
        .setName("challenge")
        .setDescription(
            "Boss, you're gonna challenge another user to a PvP battle? Good Luck."
        )
        .addUserOption((option) =>
            option
                .setName("opponent")
                .setDescription(
                    "Select the unfortunate opponent you want to challenge"
                )
                .setRequired(true)
        ),
    async execute(interaction) {
        const challenger = interaction.user;
        const challenged = interaction.options.getUser("opponent");
        const guildId = interaction.guild.id;

        // Prevent challenging oneself
        if (challenger.id === challenged.id) {
            return interaction.reply({
                content: "You cannot challenge yourself!",
                ephemeral: true,
            });
        }

        const battleQuery = new Query(pvpBattleCollectionName); // Instantiate Query for pvpBattles

        try {
            // Check if the challenger is already in an ongoing battle
            const existingChallengerBattle = await Battle.getOngoingBattle(
                guildId,
                challenger.id,
                challenged.id
            );
            if (Object.keys(existingChallengerBattle) === 0) {
                return interaction.reply({
                    content: "You are already engaged in an ongoing battle.",
                    ephemeral: true,
                });
            }

            // Check if there's an existing pending challenge from challenger to challenged
            const existingChallengeRow = await battleQuery.readOne({
                guild_id: guildId,
                challenger_id: challenger.id,
                challenged_id: challenged.id,
                status: "pending",
            });

            if (existingChallengeRow) {
                return interaction.reply({
                    content:
                        "You have already challenged this user. Please wait for their response.",
                    ephemeral: true,
                });
            }

            // Create a new battle with status 'pending'
            const battleData = {
                guild_id: guildId,
                challenger_id: challenger.id,
                challenged_id: challenged.id,
                status: "pending",
                created_at: new Date(),
            };
            const battle = await battleQuery.insertOne(battleData); // Insert new battle record

            // Create acceptance buttons with unique identifiers including guildId and battleId
            const acceptButton = new ButtonBuilder()
                .setCustomId(`pvp_accept_${guildId}_${battle.insertedId}`)
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId(`pvp_decline_${guildId}_${battle.insertedId}`)
                .setLabel("Decline")
                .setStyle(ButtonStyle.Danger);

            const actionRow = new ActionRowBuilder().addComponents(
                acceptButton,
                declineButton
            );

            // Create the challenge embed
            const challengeEmbed = new EmbedBuilder()
                .setTitle("New Challenge!")
                .setDescription(
                    `${challenger} has challenged you to a battle!\nDo you **accept**?`
                )
                .setColor("#13699c")
                .setTimestamp();

            // Send challenge message to the challenged user via DM
            const dmChannel = await challenged.createDM();
            const message = await dmChannel.send({
                embeds: [challengeEmbed],
                components: [actionRow],
            });

            await interaction.reply({
                content: `Challenge sent to ${challenged}.`,
                ephemeral: true,
            });

            // Create a message component collector for the challenged user's response
            const filter = (i) => {
                return (
                    (i.customId ===
                        `pvp_accept_${guildId}_${battle.insertedId}` ||
                        i.customId ===
                            `pvp_decline_${guildId}_${battle.insertedId}`) &&
                    i.user.id === challenged.id
                );
            };

            const collector = message.createMessageComponentCollector({
                filter,
                max: 1,
                time: 60000, // 60 seconds to respond
            });

            collector.on("collect", async (i) => {
                if (
                    i.customId === `pvp_accept_${guildId}_${battle.insertedId}`
                ) {
                    // UpdateOne battle status to 'on_going' and initialize battle
                    await battleQuery.updateOne(
                        { _id: battle.insertedId },
                        { status: BattleStatus.ON_GOING }
                    );

                    await i.update({
                        content: "You have accepted the PvP challenge!",
                        components: [],
                    });

                    // Proceed to card selection
                    await initiateCardSelection(
                        interaction,
                        battle,
                        challenger,
                        challenged,
                        guildId
                    );
                } else if (
                    i.customId === `pvp_decline_${guildId}_${battle.insertedId}`
                ) {
                    // Update battle status to 'denied'
                    await battleQuery.updateOne(
                        { _id: battle.insertedId },
                        { status: BattleStatus.DENIED }
                    );

                    await i.update({
                        content: "You have declined the PvP challenge.",
                        components: [],
                    });
                    // Notify challenger
                    await interaction.channel
                        .send({
                            content: `${challenged} has declined your PvP challenge.`,
                        })
                        .catch(() => {});
                }
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    // No response within time
                    await battleQuery.updateOne(
                        { _id: battle.insertedId },
                        { status: BattleStatus.DENIED }
                    );
                    await challenged
                        .send(
                            "You did not respond to the PvP challenge in time. Challenge canceled."
                        )
                        .catch(() => {});
                }
            });
        } catch (error) {
            console.error(`Error executing PvP command: ${error}`);
            return interaction.reply({
                content:
                    "An error occurred while initiating the PvP challenge.",
                ephemeral: true,
            });
        }
    },
};

/**
 * Initiates the card selection process for both players.
 * @param {CommandInteraction} interaction - The command interaction.
 * @param {Object} battle - The battle object from MongoDB.
 * @param {User} challenger - The challenging user.
 * @param {User} challenged - The challenged user.
 * @param {string} guildId - The Discord guild ID.
 * @returns {Promise<void>}
 */
async function initiateCardSelection(
    interaction,
    battle,
    challenger,
    challenged,
    guildId
) {
    try {
        // Fetch each player's cards as Card instances
        const challengerCards = await Card.getUserCards(challenger.id, guildId);
        const challengedCards = await Card.getUserCards(challenged.id, guildId);

        // Check if both players have at least requiredCards
        if (challengerCards.length < requiredCards) {
            await challenger
                .send(
                    `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
                )
                .catch(() => {});
            await battleQuery.updateOne(
                { _id: battle.insertedId },
                { status: BattleStatus.DENIED }
            );
            await challenged
                .send(
                    "The PvP battle was canceled because the challenger does not have enough cards."
                )
                .catch(() => {});
            return;
        }
        if (challengedCards.length < requiredCards) {
            await challenged
                .send(
                    `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
                )
                .catch(() => {});
            await battleQuery.update(
                { _id: battle.insertedId },
                { status: BattleStatus.DENIED }
            );
            await challenger
                .send(
                    "The PvP battle was canceled because you do not have enough cards."
                )
                .catch(() => {});
            return;
        }

        // Start card selection for both players
        // Initialize battle with selected cards and their powers
        const initialPowersChallenger = challengerCards.map(
            (card) => card.realPower
        );
        const initialPowersChallenged = challengedCards.map(
            (card) => card.realPower
        );

        await battleQuery.update(
            { _id: battle.insertedId },
            {
                challenger_cards: challengerCards.map((card) => card.id),
                challenged_cards: challengedCards.map((card) => card.id),
                challenger_powers: initialPowersChallenger,
                challenged_powers: initialPowersChallenged,
            }
        );

        // Start the battle loop
        await battle.startBattleLoop();
    } catch (error) {
        console.error(`Error initiating card selection: ${error}`);
        await interaction.followUp({
            content: "An error occurred during the card selection process.",
            ephemeral: true,
        });
    }
}
