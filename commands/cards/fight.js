// commands/fight.js

const {
    SlashCommandBuilder,
    ButtonBuilder,
    ButtonStyle,
    ActionRowBuilder,
    EmbedBuilder,
} = require("discord.js");
const { Battle, Card, BattleStatus } = require("../../classes/cardManager.js"); 

const sqlite3 = require("sqlite3");
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
            // Check if the challenger is already in an ongoing battle
            const existingChallengerBattle = await Battle.getOngoingBattle(guildId, challenger.id);
            if (existingChallengerBattle) {
                return interaction.reply({
                    content: "You are already engaged in an ongoing battle.",
                    ephemeral: true,
                });
            }
    
            // Check if the challenged user is already in an ongoing battle
            const existingChallengedBattle = await Battle.getOngoingBattle(guildId, challenged.id);
            if (existingChallengedBattle) {
                return interaction.reply({
                    content: "The challenged user is already engaged in an ongoing battle.",
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
                LIMIT 1
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
                    // Update battle status to 'on_going' and initialize battle
                    await battle.updateStatus(BattleStatus.ON_GOING);
    
                    await i.update({
                        content: "You have accepted the PvP challenge!",
                        components: [],
                    });
    
                    // Proceed to card selection
                    initiateCardSelection(interaction, battle, challenger, challenged, guildId);
                } else if (i.customId === `pvp_decline_${guildId}_${battle.battleId}`) {
                    // Update battle status to 'denied'
                    await battle.updateStatus(BattleStatus.DENIED);
    
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
                    await battle.updateStatus(BattleStatus.DENIED);
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
            await battle.updateStatus(BattleStatus.DENIED);
            await challenged.send(
                "The PvP battle was canceled because the challenger does not have enough cards."
            ).catch(() => {});
            return;
        }
        if (challengedCards.length < requiredCards) {
            await challenged.send(
                `You do not have enough cards to participate in a PvP battle (minimum ${requiredCards} required).`
            ).catch(() => {});
            await battle.updateStatus(BattleStatus.DENIED);
            await challenger.send(
                "The PvP battle was canceled because you do not have enough cards."
            ).catch(() => {});
            return;
        }

        // Start card selection for both players
        // Additional card selection logic can be implemented here as needed
        // Initialize battle with selected cards and their powers
        const initialPowersChallenger = challengerCards.map(card => card.realPower);
        const initialPowersChallenged = challengedCards.map(card => card.realPower);

        await battle.initializeBattle(
            challengerCards.map(card => card.id),
            challengedCards.map(card => card.id)
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
