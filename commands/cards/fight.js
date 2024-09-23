// commands/fight.js

const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Battle, Card } = require("../../classes/cardManager.js"); 

const sqlite3 = require("sqlite3")
const util = require("util");

const animedb = new sqlite3.Database("databases/animeDataBase.db");

const requiredCards = 4;
// Promisify db methods
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));
const dbRunAsync = util.promisify(animedb.run.bind(animedb));



module.exports = {
    category: "cards",
    data: new SlashCommandBuilder()
        .setName("challenge")
        .setDMPermission(false)
        .setDescription("Boss, you're gonna challenge another user to a PvP battle? Good Luck.")
        .addUserOption((option) =>
            option
                .setName("opponent")
                .setDescription("Select the unfortunate opponent you want to challenge")
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

        try {
            // Check if a battle is already ongoing for the challenger
            const existingBattle = await Battle.getOngoingBattle(guildId, challenger.id);
            if (existingBattle) {
                return interaction.reply({
                    content: "You are already engaged in an ongoing battle.",
                    ephemeral: true,
                });
            }

            // Check if there's an existing pending challenge from challenger to challenged
            const pendingQuery = `
                SELECT * FROM pvpBattles 
                WHERE guild_id = ? 
                  AND challenger_id = ? 
                  AND challenged_id = ? 
                  AND status = 'pending'
            `;
            const existingChallengeRow = await dbGetAsync(pendingQuery, [guildId, challenger.id, challenged.id]);

            if (existingChallengeRow) {
                return interaction.reply({
                    content: "You have already challenged this user. Please wait for their response.",
                    ephemeral: true,
                });
            }

            // Create a new battle with status 'pending'
            const battle = await Battle.createBattle(guildId, challenger.id, challenged.id);

            // Create acceptance buttons with unique identifiers including guildId and battleId
            const acceptButton = new ButtonBuilder()
                .setCustomId(`pvp_accept_${guildId}_${battle.battleId}`)
                .setLabel("Accept")
                .setStyle(ButtonStyle.Success);

            const declineButton = new ButtonBuilder()
                .setCustomId(`pvp_decline_${guildId}_${battle.battleId}`)
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
                    `${challenger} has challenged you to a battle!\nDo you accept?`
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
                    (i.customId === `pvp_accept_${guildId}_${battle.battleId}` ||
                        i.customId === `pvp_decline_${guildId}_${battle.battleId}`) &&
                    i.user.id === challenged.id
                );
            };

            const collector = message.createMessageComponentCollector({
                filter,
                max: 1,
                time: 60000, // 60 seconds to respond
            });

            collector.on("collect", async (i) => {
                if (i.customId === `pvp_accept_${guildId}_${battle.battleId}`) {
                    // Update battle status to 'ongoing' and initialize battle
                    await battle.updateStatus('ongoing');

                    await i.update({
                        content: "You have accepted the PvP challenge!",
                        components: [],
                    });

                    // Proceed to card selection
                    initiateCardSelection(interaction, battle, challenger, challenged, guildId);
                } else if (i.customId === `pvp_decline_${guildId}_${battle.battleId}`) {
                    // Update battle status to 'declined'
                    await battle.updateStatus('declined');

                    await i.update({
                        content: "You have declined the PvP challenge.",
                        components: [],
                    });
                    // Notify challenger
                    await interaction.channel.send({
                        content: `${challenged} has declined your PvP challenge.`,
                        ephemeral: true,
                    }).catch(() => {});
                }
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    // No response within time
                    await battle.updateStatus('declined');
                    await challenged.send(
                        "You did not respond to the PvP challenge in time. Challenge canceled."
                    ).catch(() => {});
                }
            });
        } catch (error) {
            console.error(`Error executing PvP command: ${error}`);
            return interaction.reply({
                content: "An error occurred while initiating the PvP challenge.",
                ephemeral: true,
            });
        }
    },
};

/**
 * Initiates the card selection process for both players.
 * @param {CommandInteraction} interaction - The command interaction.
 * @param {Battle} battle - The battle instance.
 * @param {User} challenger - The challenging user.
 * @param {User} challenged - The challenged user.
 * @param {string} guildId - The Discord guild ID.
 * @returns {Promise<void>}
 */
async function initiateCardSelection(interaction, battle, challenger, challenged, guildId) {
    try {
        // Fetch each player's cards as Card instances
        const challengerCards = await Card.getUserCards(challenger.id, guildId);
        const challengedCards = await Card.getUserCards(challenged.id, guildId);

        // Check if both players have at least requiredCards
        if (challengerCards.length < requiredCards) {
            await challenger.send(
                `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
            ).catch(() => {});
            await battle.updateStatus('declined');
            await challenged.send(
                "The PvP battle was canceled because the challenger does not have enough cards."
            ).catch(() => {});
            return;
        }
        if (challengedCards.length < requiredCards) {
            await challenged.send(
                `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
            ).catch(() => {});
            await battle.updateStatus('declined');
            await challenger.send(
                "The PvP battle was canceled because you do not have enough cards."
            ).catch(() => {});
            return;
        }

        // Start card selection for both players
        const selectedChallengerCards = await selectCards(
            challenger,
            challengerCards,
            "Challenger",
            guildId
        );
        const selectedChallengedCards = await selectCards(
            challenged,
            challengedCards,
            "Challenged",
            guildId
        );

        if (!selectedChallengerCards || !selectedChallengedCards) {
            // One of the players failed to select cards in time
            await battle.updateStatus('declined');
            if (!selectedChallengerCards) {
                await challenger.send(
                    "You did not select your cards in time. The PvP battle has been canceled."
                ).catch(() => {});
            }
            if (!selectedChallengedCards) {
                await challenged.send(
                    "You did not select your cards in time. The PvP battle has been canceled."
                ).catch(() => {});
            }
            return;
        }

        // Initialize battle with selected cards and their powers
        const initialPowersChallenger = selectedChallengerCards.map(card => card.realPower);
        const initialPowersChallenged = selectedChallengedCards.map(card => card.realPower);

        await battle.initializeBattle(
            selectedChallengerCards.map(card => card.id),
            selectedChallengedCards.map(card => card.id),
            initialPowersChallenger,
            initialPowersChallenged
        );

        // Send the battle embed in the channel
        const battleEmbed = await battle.generateBattleEmbed(interaction.client);
        const battleMessage = await interaction.channel.send({ embeds: [battleEmbed] });

        // Create control buttons for both players
        await createControlButtons(challenger, battleMessage.id, guildId);
        await createControlButtons(challenged, battleMessage.id, guildId);
    } catch (error) {
        console.error(`Error initiating card selection: ${error}`);
        await interaction.followUp({
            content: "An error occurred during the card selection process.",
            ephemeral: true,
        });
    }
}

/**
 * Allows a user to select a specified number of cards for the battle.
 * Utilizes the Card class for better object management.
 * @param {User} user - The Discord user.
 * @param {Array<Card>} userCards - The user's owned Card instances.
 * @param {string} role - The role of the user (e.g., "Challenger").
 * @param {string} guildId - The Discord guild ID.
 * @returns {Promise<Array<Card>|null>} - Selected Card instances or null if selection failed.
 */
async function selectCards(user, userCards, role, guildId) {
    const {
        ActionRowBuilder,
        SelectMenuBuilder,
        EmbedBuilder,
    } = require("discord.js");

    const options = userCards.map((card) => {
        return {
            label: card.Name,
            description: `Rank: ${card.Rank}, Power: ${card.realPower}`,
            value: `${card.id}`,
        };
    });

    const embed = new EmbedBuilder()
        .setTitle(`${role} Card Selection`)
        .setDescription(`Please select **exactly ${requiredCards}** cards for the battle.`)
        .setColor("#15733a");

    const selectMenu = new SelectMenuBuilder()
        .setCustomId(`select_cards_${guildId}_${user.id}`)
        .setPlaceholder(`Select ${requiredCards} cards`)
        .setMinValues(requiredCards)
        .setMaxValues(requiredCards)
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
        const dmChannel = await user.createDM();
        const message = await dmChannel.send({ embeds: [embed], components: [row] });

        // Create a collector for the selection
        const filter = (i) =>
            i.customId === `select_cards_${guildId}_${user.id}` &&
            i.user.id === user.id;

        const collector = message.createMessageComponentCollector({
            filter,
            max: 1,
            time: 120000, // 2 minutes
        });

        const selectedCards = await new Promise((resolve) => {
            collector.on("collect", async (interaction) => {
                const selected = interaction.values;
                if (selected.length !== requiredCards) {
                    await interaction.reply({
                        content: `You must select exactly ${requiredCards} cards.`,
                        ephemeral: true,
                    });
                    resolve(null);
                    return;
                }

                await interaction.update({
                    content: "Cards selected!",
                    components: [],
                });

                // Map selected card IDs to Card instances
                const selectedCardInstances = userCards.filter(card =>
                    selected.includes(String(card.id))
                );

                resolve(selectedCardInstances);
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    await user.send(
                        "You did not select your cards in time. The PvP battle has been canceled."
                    ).catch(() => {});
                    resolve(null);
                }
            });
        });

        if (!selectedCards) return null;

        return selectedCards;
    } catch (error) {
        console.error(`Could not send DM to ${user.tag}.`, error);
        return null;
    }
}

/**
 * Creates control buttons for a user to perform actions during the battle.
 * @param {User} user - The Discord user.
 * @param {string} battleMessageId - The message ID of the battle.
 * @param {string} guildId - The Discord guild ID.
 */
async function createControlButtons(user, battleMessageId, guildId) {
    const {
        ButtonBuilder,
        ButtonStyle,
        ActionRowBuilder,
    } = require("discord.js");

    const move0 = new ButtonBuilder()
        .setCustomId(`move_0_${guildId}_${battleMessageId}_${user.id}`)
        .setLabel("0")
        .setStyle(ButtonStyle.Primary);

    const move1 = new ButtonBuilder()
        .setCustomId(`move_1_${guildId}_${battleMessageId}_${user.id}`)
        .setLabel("1")
        .setStyle(ButtonStyle.Primary);

    const move2 = new ButtonBuilder()
        .setCustomId(`move_2_${guildId}_${battleMessageId}_${user.id}`)
        .setLabel("2")
        .setStyle(ButtonStyle.Primary);

    const inspectButton = new ButtonBuilder()
        .setCustomId(`inspect_${guildId}_${battleMessageId}_${user.id}`)
        .setLabel("Inspect")
        .setStyle(ButtonStyle.Secondary);

    const changeCardButton = new ButtonBuilder()
        .setCustomId(`change_card_${guildId}_${battleMessageId}_${user.id}`)
        .setLabel("Change Card")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(
        move0,
        move1,
        move2,
        inspectButton,
        changeCardButton
    );

    // Send the ephemeral message with buttons
    user.send({
        content: "Choose your move:",
        components: [row],
    }).catch(() => {});
}
