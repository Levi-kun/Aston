// Import necessary modules
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

const requiredCards = 4;

// Initialize and connect to the SQLite database
const animedb = new sqlite3.Database("databases/animeDataBase.db");

// Promisify db methods for async/await usage
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));
const dbRunAsync = util.promisify(animedb.run.bind(animedb));

module.exports = {
    data: new SlashCommandBuilder()
        .setName("pvp")
        .setDescription("Challenge another user to a PvP battle!")
        .addUserOption((option) =>
            option
                .setName("opponent")
                .setDescription("Select the user you want to challenge")
                .setRequired(true)
        ),
    async execute(interaction) {
        const challenger = interaction.user;
        const challenged = interaction.options.getUser("opponent");
        const guildId = interaction.guildId; // Capture guildId

        // Prevent challenging oneself
        if (challenger.id === challenged.id) {
            return interaction.reply({
                content: "You cannot challenge yourself!",
                ephemeral: true,
            });
        }

        // Check if a battle is already ongoing involving either user in this guild
        const existingBattle = await dbGetAsync(
            `SELECT * FROM pvpBattles WHERE 
            guild_id = ? AND 
            (challenger_id = ? OR challenged_id = ?) AND status = 'ongoing'`,
            [guildId, challenger.id, challenger.id]
        );

        if (existingBattle) {
            return interaction.reply({
                content: "You are already engaged in an ongoing battle.",
                ephemeral: true,
            });
        }

        const existingChallenge = await dbGetAsync(
            `SELECT * FROM pvpBattles WHERE 
            guild_id = ? AND 
            challenger_id = ? AND challenged_id = ? AND status = 'pending'`,
            [guildId, challenger.id, challenged.id]
        );

        if (existingChallenge) {
            return interaction.reply({
                content:
                    "You have already challenged this user. Please wait for their response.",
                ephemeral: true,
            });
        }

        // Insert a new challenge into the database with status 'pending' and guild_id
        await dbRunAsync(
            `INSERT INTO pvpBattles (guild_id, challenger_id, challenged_id, status) VALUES (?, ?, ?, 'pending')`,
            [guildId, challenger.id, challenged.id]
        );

        // Create acceptance buttons with unique identifiers including guildId
        const acceptButton = new ButtonBuilder()
            .setCustomId(
                `pvp_accept_${guildId}_${challenger.id}_${challenged.id}`
            )
            .setLabel("Accept")
            .setStyle(ButtonStyle.Success);

        const declineButton = new ButtonBuilder()
            .setCustomId(
                `pvp_decline_${guildId}_${challenger.id}_${challenged.id}`
            )
            .setLabel("Decline")
            .setStyle(ButtonStyle.Danger);

        const actionRow = new ActionRowBuilder().addComponents(
            acceptButton,
            declineButton
        );

        // Send challenge message to the challenged user via DM
        const challengeEmbed = new EmbedBuilder()
            .setTitle("New PvP Challenge!")
            .setDescription(
                `${challenger} has challenged you to a battle!\nDo you accept?`
            )
            .setColor("BLUE")
            .setTimestamp();

        try {
            await challenged.send({
                embeds: [challengeEmbed],
                components: [actionRow],
            });
            await interaction.reply({
                content: `Challenge sent to ${challenged}.`,
                ephemeral: true,
            });
        } catch (error) {
            console.error(`Could not send DM to ${challenged.tag}.`);
            // Remove the pending challenge from the database
            await dbRunAsync(
                `DELETE FROM pvpBattles WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ? AND status = 'pending'`,
                [guildId, challenger.id, challenged.id]
            );
            return interaction.reply({
                content: `${challenged} has DMs disabled. Challenge canceled.`,
                ephemeral: true,
            });
        }

        // Create a message component collector for the challenged user's response
        const filter = (i) => {
            return (
                (i.customId ===
                    `pvp_accept_${guildId}_${challenger.id}_${challenged.id}` ||
                    i.customId ===
                        `pvp_decline_${guildId}_${challenger.id}_${challenged.id}`) &&
                i.user.id === challenged.id
            );
        };

        const dmChannel = await challenged.createDM();
        const collector = dmChannel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 60000,
        }); // 60 seconds to respond

        collector.on("collect", async (i) => {
            if (
                i.customId ===
                `pvp_accept_${guildId}_${challenger.id}_${challenged.id}`
            ) {
                // Update challenge status to 'accepted' and initialize battle
                await dbRunAsync(
                    `UPDATE pvpBattles SET status = 'ongoing' WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ?`,
                    [guildId, challenger.id, challenged.id]
                );

                await i.update({
                    content: "You have accepted the PvP challenge!",
                    components: [],
                });

                // Proceed to card selection
                initiateCardSelection(
                    interaction,
                    challenger,
                    challenged,
                    guildId
                );
            } else if (
                i.customId ===
                `pvp_decline_${guildId}_${challenger.id}_${challenged.id}`
            ) {
                // Update challenge status to 'declined'
                await dbRunAsync(
                    `UPDATE pvpBattles SET status = 'declined' WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ?`,
                    [guildId, challenger.id, challenged.id]
                );

                await i.update({
                    content: "You have declined the PvP challenge.",
                    components: [],
                });
                // Notify challenger
                await challenger
                    .send(`${challenged} has declined your PvP challenge.`)
                    .catch(() => {});
            }
        });

        collector.on("end", async (collected) => {
            if (collected.size === 0) {
                // No response within time
                await dbRunAsync(
                    `UPDATE pvpBattles SET status = 'declined' WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ?`,
                    [guildId, challenger.id, challenged.id]
                );
                await challenged
                    .send(
                        "You did not respond to the PvP challenge in time. Challenge canceled."
                    )
                    .catch(() => {});
            }
        });
    },
};

// Function to initiate card selection (updated to include guildId)
async function initiateCardSelection(
    interaction,
    challenger,
    challenged,
    guildId
) {
    // Fetch each player's cards
    const challengerCards = await getUserCards(challenger.id, guildId);
    const challengedCards = await getUserCards(challenged.id, guildId);

    // Check if both players have at least REQUIREDCARDS cards
    if (challengerCards.length < requiredCards) {
        await challenger
            .send(
                `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
            )
            .catch(() => {});
        await endBattleDueToInsufficientCards(
            challenger.id,
            challenged.id,
            guildId
        );
        return;
    }
    if (challengedCards.length < requiredCards) {
        await challenged
            .send(
                `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
            )
            .catch(() => {});
        await endBattleDueToInsufficientCards(
            challenger.id,
            challenged.id,
            guildId
        );
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
        await endBattleDueToNoSelection(challenger.id, challenged.id, guildId);
        return;
    }

    // Initialize battle in the database
    const initialPowersChallenger = selectedChallengerCards.map(
        (card) => card.realPower
    );
    const initialPowersChallenged = selectedChallengedCards.map(
        (card) => card.realPower
    );

    await dbRunAsync(
        `UPDATE pvpBattles 
         SET challenger_cards = ?, challenged_cards = ?, 
             challenger_powers = ?, challenged_powers = ?, 
             current_turn = 'challenger' 
         WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ? AND status = 'ongoing'`,
        [
            JSON.stringify(selectedChallengerCards.map((card) => card.card_id)),
            JSON.stringify(selectedChallengedCards.map((card) => card.card_id)),
            JSON.stringify(initialPowersChallenger),
            JSON.stringify(initialPowersChallenged),
            guildId,
            challenger.id,
            challenged.id,
        ]
    );

    // Send the base message in a designated channel
    const battleChannel = interaction.channel; // You can specify a dedicated channel if preferred

    const battleEmbed = generateBattleEmbed(
        selectedChallengerCards,
        initialPowersChallenger,
        selectedChallengedCards,
        initialPowersChallenged
    );

    const baseMessage = await battleChannel.send({ embeds: [battleEmbed] });

    // Create control buttons for both players
    createControlButtons(challenger, baseMessage.id, guildId);
    createControlButtons(challenged, baseMessage.id, guildId);
}

// Function to fetch user's owned cards with guildId
async function getUserCards(userId, guildId) {
    const query = `SELECT oc.card_id, acl.Name, oc.rank, oc.realPower, acl.moves 
                   FROM owned_Cards oc
                   JOIN animeCardList acl ON oc.card_id = acl.id
                   WHERE oc.player_id = ? AND oc.guild_id = ?`;
    const cards = await dbAllAsync(query, [userId, guildId]);
    return cards;
}

// Function to handle insufficient cards with guildId
async function endBattleDueToInsufficientCards(
    challengerId,
    challengedId,
    guildId
) {
    // Update battle status to 'declined'
    await dbRunAsync(
        `UPDATE pvpBattles SET status = 'declined' WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ?`,
        [guildId, challengerId, challengedId]
    );

    // Fetch user objects
    const challenger = await interaction.client.users.fetch(challengerId);
    const challenged = await interaction.client.users.fetch(challengedId);

    // Notify both players
    await challenger
        .send(
            "The PvP battle was canceled because the opponent does not have enough cards."
        )
        .catch(() => {});
    await challenged
        .send(
            "The PvP battle was canceled because you do not have enough cards."
        )
        .catch(() => {});
}

// Function to handle no selection with guildId
async function endBattleDueToNoSelection(challengerId, challengedId, guildId) {
    // Update battle status to 'declined'
    await dbRunAsync(
        `UPDATE pvpBattles SET status = 'declined' WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ?`,
        [guildId, challengerId, challengedId]
    );

    // Fetch user objects
    const challenger = await interaction.client.users.fetch(challengerId);
    const challenged = await interaction.client.users.fetch(challengedId);

    // Notify both players
    await challenger
        .send(
            "The PvP battle was canceled because the opponent did not select their cards in time."
        )
        .catch(() => {});
    await challenged
        .send(
            "The PvP battle was canceled because you did not select your cards in time."
        )
        .catch(() => {});
}
// Function to allow a user to select 3 cards (updated to include guildId)
async function selectCards(user, userCards, role, guildId) {
    const {
        ActionRowBuilder,
        SelectMenuBuilder,
        EmbedBuilder,
    } = require("discord.js");

    const options = userCards.map((card) => {
        return {
            label: card.Name,
            description: `Rank: ${card.rank}, Power: ${card.realPower}`,
            value: `${card.card_id}`,
        };
    });

    const embed = new EmbedBuilder()
        .setTitle(`${role} Card Selection`)
        .setDescription("Please select **exactly 3** cards for the battle.")
        .setColor("GREEN");

    const selectMenu = new SelectMenuBuilder()
        .setCustomId(`select_cards_${guildId}_${user.id}`)
        .setPlaceholder("Select 3 cards")
        .setMinValues(3)
        .setMaxValues(3)
        .addOptions(options);

    const row = new ActionRowBuilder().addComponents(selectMenu);

    try {
        const dmChannel = await user.createDM();
        await dmChannel.send({ embeds: [embed], components: [row] });

        // Create a collector for the selection
        const filter = (i) =>
            i.customId === `select_cards_${guildId}_${user.id}` &&
            i.user.id === user.id;

        const collector = dmChannel.createMessageComponentCollector({
            filter,
            max: 1,
            time: 120000,
        }); // 2 minutes

        const selectedCards = await new Promise((resolve) => {
            collector.on("collect", async (interaction) => {
                const selected = interaction.values;
                if (selected.length !== 3) {
                    await interaction.reply({
                        content: "You must select exactly 3 cards.",
                        ephemeral: true,
                    });
                    resolve(null);
                    return;
                }

                await interaction.update({
                    content: "Cards selected!",
                    components: [],
                });
                resolve(selected);
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    await user
                        .send(
                            "You did not select your cards in time. The PvP battle has been canceled."
                        )
                        .catch(() => {});
                    resolve(null);
                }
            });
        });

        if (!selectedCards) return null;

        // Fetch full card details
        const selectedCardDetails = userCards.filter((card) =>
            selectedCards.includes(card.card_id)
        );
        return selectedCardDetails;
    } catch (error) {
        console.error(`Could not send DM to ${user.tag}.`);
        return null;
    }
}
// Function to generate the battle embed (updated to include guild-specific information if needed)
function generateBattleEmbed(
    challengerCards,
    challengerPowers,
    challengedCards,
    challengedPowers
) {
    const embed = new EmbedBuilder()
        .setTitle("PvP Battle")
        .setDescription("The battle has begun!")
        .setColor("PURPLE")
        .setTimestamp();

    // Challenger's Cards
    const challengerField = challengerCards
        .map((card, index) => {
            return `**${card.Name}**\nPower: ${challengerPowers[index]}`;
        })
        .join("\n\n");

    // Challenged's Cards
    const challengedField = challengedCards
        .map((card, index) => {
            return `**${card.Name}**\nPower: ${challengedPowers[index]}`;
        })
        .join("\n\n");

    embed.addFields(
        {
            name: `${challenger.username}'s Cards`,
            value: challengerField,
            inline: true,
        },
        {
            name: `${challenged.username}'s Cards`,
            value: challengedField,
            inline: true,
        }
    );

    return embed;
}
// Function to create control buttons for a user (updated to include guildId)
function createControlButtons(user, battleMessageId, guildId) {
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
        ephemeral: true,
    }).catch(() => {});
}
