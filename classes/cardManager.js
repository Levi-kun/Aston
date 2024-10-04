const {
    Collection,
    Guild,
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    EmbedBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js"); // Adjust the path accordingly
const bot = require("../client.js");
const eventEmitter = require("../src/eventManager");

const BattleStatus = Object.freeze({
    PENDING: "pending",
    DENIED: "denied",
    ON_GOING: "on_going",
    FINISHED: "finished",
});

const moveTypes = Object.freeze({
    DMG: "DMG",
    SPECIAL: "SPECIAL",
    BUFF: "BUFF",
    DEBUFF: "DEBUFF",
    PASSIVE: "PASSIVE",
    FOCUS: "FOCUS",
});

class Battle {
    constructor(battleData) {
        this.battleId = battleData._id; // MongoDB uses _id
        this.guildId = battleData.guild_id;
        this.challengerId = battleData.challenger_id;
        this.challengedId = battleData.challenged_id;
        this.status = battleData.status;
        this.currentTurn = battleData.current_turn; // User ID of current turn
        this.winner_id = battleData.winner_id || null;
        this.loser_id = battleData.loser_id || null;
        this.turnCount = battleData.turnCount || 0;

        this.created_at = battleData.created_at;
        this.finished_at = battleData.finished_at;

        this.challengerCards = battleData.challenger_cards || [];
        this.challengedCards = battleData.challenged_cards || [];

        this.battleMessages = {}; // Tracks message IDs
        this.lastMove = ""; // Stores the description of the last move

        // Initialize Query instances
        this.battlesQuery = new Query("pvpBattles");
        this.movesQuery = new Query("pvpMoves");
    }

    // Static methods...

    static async getOngoingBattle(guildId, playerId) {
        try {
            const battlesQuery = new Query("pvpBattles");
            const result = await battlesQuery.readOne({
                guild_id: guildId,
                $or: [{ challenger_id: playerId }, { challenged_id: playerId }],
                status: { $in: ["pending", "on_going"] },
            });

            if (result) {
                return new Battle(result);
            }

            return null;
        } catch (e) {
            console.error(`Error fetching ongoing battle: ${e.message}`);
            return null;
        }
    }

    static async createBattle(guildId, challengerId, challengedId) {
        try {
            const battlesQuery = new Query("pvpBattles");
            const battleData = {
                guild_id: guildId,
                challenger_id: challengerId,
                challenged_id: challengedId,
                status: BattleStatus.PENDING,
                created_at: new Date(),
                challenger_cards: [],
                challenged_cards: [],
                challenger_powers: [],
                challenged_powers: [],
                current_turn: null,
                turnCount: 0,
            };

            // Validate and insert the battle data
            await battlesQuery.insertOne(battleData);

            // Retrieve the newly created battle data
            const insertedBattle = await battlesQuery.readOne(
                {
                    guild_id: guildId,
                    challenger_id: challengerId,
                    challenged_id: challengedId,
                },
                { sort: { created_at: -1 } }
            );

            if (!insertedBattle)
                throw new Error("Failed to retrieve the created battle.");

            return new Battle(insertedBattle);
        } catch (error) {
            console.error(`Error creating battle: ${error.message}`);
            throw error;
        }
    }

    /**
     * This method handles forfeiting a battle.
     * It updates the battle status to 'finished', sets the winner and loser, and logs the finish time.
     *
     * @param {string} user_id - The ID of the user who is forfeiting.
     * @returns {object} - Contains battleData, winner_id, and loser_id.
     */
    async forfeit(user_id) {
        try {
            // Ensure the battle is ongoing and the user is part of it
            if (this.status !== BattleStatus.ON_GOING) {
                throw new Error("Battle is not ongoing.");
            }
            if (
                this.challengerId !== user_id &&
                this.challengedId !== user_id
            ) {
                throw new Error("User is not part of this battle.");
            }

            // Determine the winner and loser
            let winner_id =
                this.challengerId === user_id
                    ? this.challengedId
                    : this.challengerId;
            let loser_id = user_id;

            // Update the battle in the database
            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                {
                    $set: {
                        status: BattleStatus.FINISHED,
                        winner_id: winner_id,
                        loser_id: loser_id,
                        finished_at: new Date(),
                    },
                }
            );

            // Update instance properties
            this.status = BattleStatus.FINISHED;
            this.winner_id = winner_id;
            this.loser_id = loser_id;
            this.finished_at = new Date().toISOString();

            let valuesToSendBack = {
                battleData: this,
                winner_id,
                loser_id,
            };
            return valuesToSendBack;
        } catch (error) {
            console.error(`Error in forfeit: ${error.message}`);
            throw error;
        }
    }

    /** Helper to get a player by ID */
    async getPlayerFromId(id) {
        try {
            const guild = await this.getGuild();
            if (!guild) return null;
            return await guild.members.fetch(id);
        } catch (error) {
            console.error(`Error fetching player ${id}: ${error.message}`);
            return null;
        }
    }

    /** Fetch guild from cache or Discord API */
    async getGuild() {
        try {
            const guild =
                bot.guilds.cache.get(this.guildId) ||
                (await bot.guilds.fetch(this.guildId));
            if (!guild) {
                console.error(`Guild with ID ${this.guildId} not found`);
                return null;
            }
            return guild;
        } catch (error) {
            console.error(`Error fetching guild: ${error.message}`);
            return null;
        }
    }

    /** Save battle turn and status updates */
    async updateTurnAndStatus(newTurn, incrementStatus = true) {
        try {
            let updateData = { current_turn: newTurn };
            if (incrementStatus) {
                updateData.status = BattleStatus.ON_GOING;
                updateData.turnCount = (this.turnCount || 0) + 1;
            }

            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                { $set: updateData }
            );

            this.currentTurn = newTurn;
            if (incrementStatus) {
                this.status = BattleStatus.ON_GOING;
                this.turnCount += 1;
            } else {
                this.status = updateData.status || this.status;
            }
        } catch (error) {
            console.error(`Error updating turn and status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Starts the battle by setting the status to 'on_going' and initializing the turn.
     */
    async startBattle() {
        try {
            this.status = BattleStatus.ON_GOING;
            await this.updateStatus(this.status);

            // Initialize turn count if not already set
            if (!this.turnCount) {
                this.turnCount = 1;
                await this.incrementTurnCount();
            }

            // Determine first player
            await this.chooseFirstPlayer();

            await this.startBattleLoop();
        } catch (error) {
            console.error(`Error starting battle: ${error.message}`);
            throw error;
        }
    }

    async updateStatus(newStatus) {
        try {
            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                { $set: { status: newStatus } }
            );

            // Update the instance's status as well
            this.status = newStatus;
        } catch (error) {
            console.error(`Error updating battle status: ${error.message}`);
            throw error;
        }
    }

    /**
     * Determines who goes first and allows the selected player to decide their turn order.
     */
    async chooseFirstPlayer() {
        try {
            const firstPlayer =
                Math.random() < 0.5 ? this.challengerId : this.challengedId;
            const player = await this.getPlayerFromId(firstPlayer);
            if (!player) {
                throw new Error("First player not found.");
            }

            const channel = await this.getBattleChannel();
            if (!channel) {
                throw new Error("Battle channel not found.");
            }

            // Create buttons for the player to choose turn order
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`choose_first_${this.battleId}_1`) // 1 for first
                    .setLabel(`Go First`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`choose_first_${this.battleId}_2`) // 2 for second
                    .setLabel(`Go Second`)
                    .setStyle(ButtonStyle.Primary)
            );

            const embed = new EmbedBuilder()
                .setTitle("Choose Turn Order")
                .setDescription(
                    `${player.user.username}, would you like to go **first** or **second**?`
                )
                .setColor("#3498DB");

            const message = await channel.send({
                embeds: [embed],
                components: [row],
            });
            this.battleMessages.turnOrderMessage = message.id;

            // Listen for button interactions
            const filter = (interaction) => {
                return (
                    interaction.isButton() &&
                    interaction.customId.startsWith(
                        `choose_first_${this.battleId}_`
                    ) &&
                    interaction.user.id === player.id
                );
            };

            const collector = channel.createMessageComponentCollector({
                filter,
                time: 30000,
            });

            collector.on("collect", async (interaction) => {
                const choice = interaction.customId.split(
                    `choose_first_${this.battleId}_`
                )[1];
                if (choice === "1") {
                    this.currentTurn = player.id; // Player chooses to go first
                } else if (choice === "2") {
                    // Set turn to the other player
                    this.currentTurn =
                        player.id === this.challengerId
                            ? this.challengedId
                            : this.challengerId;
                }

                // Update the battle in the database
                await this.updateTurnAndStatus(this.currentTurn, false);

                // Disable buttons after choice
                const disabledRow = new ActionRowBuilder().addComponents(
                    new ButtonBuilder()
                        .setCustomId(`choose_first_${this.battleId}_1`)
                        .setLabel(`Go First`)
                        .setStyle(ButtonStyle.Success)
                        .setDisabled(true),
                    new ButtonBuilder()
                        .setCustomId(`choose_first_${this.battleId}_2`)
                        .setLabel(`Go Second`)
                        .setStyle(ButtonStyle.Primary)
                        .setDisabled(true)
                );

                await interaction.update({ components: [disabledRow] });
                collector.stop();

                // Delete the turn order message
                await message.delete();
            });

            collector.on("end", async (collected) => {
                if (collected.size === 0) {
                    // If no response, default to firstPlayer going first
                    this.currentTurn = firstPlayer;
                    await this.updateTurnAndStatus(this.currentTurn, false);
                    channel.send(
                        `${player.user.username} did not choose turn order. ${player.user.username} will go first by default.`
                    );
                }
            });
        } catch (error) {
            console.error(`Error in choosing first player: ${error.message}`);
            throw error;
        }
    }

    /**
     * Increments the turn count by 1.
     */
    async incrementTurnCount() {
        try {
            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                { $inc: { turnCount: 1 } }
            );
            this.turnCount += 1;
        } catch (error) {
            console.error(`Error incrementing turn count: ${error.message}`);
            throw error;
        }
    }

    /** Initializes battle and selects who goes first */
    async initializeBattle(challengerCards, challengedCards) {
        try {
            // Get original cards by their IDs
            const originalChallengerCards = await Card.getCardsByIds(
                challengerCards,
                this.guildId
            );
            const originalChallengedCards = await Card.getCardsByIds(
                challengedCards,
                this.guildId
            );

            // Create copies of the original cards
            this.challengerCards = originalChallengerCards.map((card) =>
                card.clone()
            );
            this.challengedCards = originalChallengedCards.map((card) =>
                card.clone()
            );

            // Set active cards to the first card of each player
            this.activeChallengerCard = this.challengerCards[0];
            this.activeChallengedCard = this.challengedCards[0];

            await this.startBattle();
        } catch (error) {
            console.error(`Error initializing battle: ${error.message}`);
            throw error;
        }
    }

    /** Main battle loop */
    async startBattleLoop() {
        await this.sendFieldUpdate();
        await this.sendTurnPrompt();
    }

    /** Send a turn prompt to the active player */
    async sendTurnPrompt() {
        try {
            const currentPlayer = this.currentTurn;
            const player = await this.getPlayerFromId(currentPlayer);
            if (!player) {
                throw new Error("Current player not found.");
            }

            const row = this.createControlButtons();

            const dmChannel = await player.createDM();
            const embed = new EmbedBuilder()
                .setTitle("Your Turn!")
                .setDescription(`It's your turn to make a move.`)
                .setColor("#FFD700");

            await dmChannel.send({
                embeds: [embed],
                components: [row],
            });
        } catch (error) {
            console.error(`Error sending turn prompt: ${error.message}`);
            throw error;
        }
    }

    /** Handle move made by player */
    async handleMove(playerId, moveId) {
        try {
            const isChallenger = playerId === this.challengerId;
            const activeCard = isChallenger
                ? this.activeChallengerCard
                : this.activeChallengedCard;

            // Use the Card class to retrieve the move
            const move = activeCard.getMoveById(moveId);

            if (!move) {
                throw new Error("Invalid move.");
            }

            // Calculate damage or apply effects based on move type
            let real_dmg = move.calculateDamage(activeCard.realPower);

            switch (move.moveType) {
                case "DMG":
                    await this.applyDamage(
                        isChallenger ? this.challengedId : this.challengerId,
                        real_dmg
                    );
                    break;
                case "BUFF":
                    // Implement buff logic
                    break;
                case "DEBUFF":
                    // Implement debuff logic
                    break;
                case "SPECIAL":
                    // Implement special move logic
                    break;
                case "FOCUS":
                    // Implement focus logic
                    break;
                case "PASSIVE":
                    // Passive moves are always active; no action needed
                    break;
                default:
                    throw new Error("Unknown move type.");
            }

            this.lastMove = `${activeCard.Name} uses ${move.moveName}`;
            this.turnCount += 1;

            // Log the move
            await this.logMove(playerId, move, real_dmg);

            // Switch turn to the other player
            this.currentTurn = isChallenger
                ? this.challengedId
                : this.challengerId;
            await this.updateTurnAndStatus(this.currentTurn, false);

            await this.sendFieldUpdate();

            // Check for battle end conditions
            const winner = this.getWinner();
            if (winner) {
                await this.endBattle(winner);
            } else {
                await this.startBattleLoop();
            }
        } catch (error) {
            console.error(`Error handling move: ${error.message}`);
            throw error;
        }
    }

    /**
     * Applies damage to the target player by reducing their active card's power.
     *
     * @param {string} targetId - The ID of the player being attacked.
     * @param {number} damage - The amount of damage to apply.
     */
    async applyDamage(targetId, damage) {
        try {
            if (targetId === this.challengerId) {
                this.activeChallengerCard.realPower -= damage;
                if (this.activeChallengerCard.realPower < 0)
                    this.activeChallengerCard.realPower = 0;
            } else {
                this.activeChallengedCard.realPower -= damage;
                if (this.activeChallengedCard.realPower < 0)
                    this.activeChallengedCard.realPower = 0;
            }

            // Optionally, update the card's power in the database if needed
        } catch (error) {
            console.error(`Error applying damage: ${error.message}`);
            throw error;
        }
    }

    /**
     * Logs a move into the pvpMoves collection.
     *
     * @param {string} playerId - The ID of the player making the move.
     * @param {Move} move - The move being made.
     * @param {number} real_dmg - The calculated damage from the move.
     */
    async logMove(playerId, move, real_dmg) {
        try {
            const targetCardId =
                playerId === this.challengerId
                    ? this.activeChallengedCard._id // Assuming each card has a unique ID
                    : this.activeChallengerCard._id;

            const moveData = {
                battle_id: this.battleId,
                move_id: move.moveId,
                player_id: playerId,
                move_type: move.moveType,
                special_dmg: move.specialDMG || 0,
                target_card_id: targetCardId,
                value: real_dmg, // Using real_dmg directly
                move_at: new Date(),
                target_value:
                    playerId === this.challengerId
                        ? this.activeChallengedCard.realPower
                        : this.activeChallengerCard.realPower,
                target_effect: move.target_effect || "",
                modifiers: move.modifiers || [],
                real_dmg: real_dmg,
            };

            // Validate move data against pvpMovesSchema
            await this.movesQuery.validateData(moveData);

            await this.movesQuery.insertOne(moveData);
        } catch (error) {
            console.error(`Error logging move: ${error.message}`);
            throw error;
        }
    }

    /** Sends an update to the battle field */
    async sendFieldUpdate() {
        try {
            const embed = this.generateFieldEmbed();
            const channel = await this.getBattleChannel();

            if (this.battleMessages.fieldMessage) {
                const message = await channel.messages.fetch(
                    this.battleMessages.fieldMessage
                );
                await message.edit({ embeds: [embed] });
            } else {
                const message = await channel.send({ embeds: [embed] });
                this.battleMessages.fieldMessage = message.id;
            }
        } catch (error) {
            console.error(`Error sending field update: ${error.message}`);
            throw error;
        }
    }

    /** Generate an embed for the battle field */
    generateFieldEmbed() {
        return new EmbedBuilder()
            .setTitle("Battlefield")
            .setDescription(
                `**Challenger's Card:** ${this.activeChallengerCard.Name} | Power: ${this.activeChallengerCard.realPower}\n` +
                    `**Challenged's Card:** ${this.activeChallengedCard.Name} | Power: ${this.activeChallengedCard.realPower}\n` +
                    `**Last Move:** ${this.lastMove || "None"}\n` +
                    `**Turn Count:** ${this.turnCount}`
            )
            .setColor("#2ECC71");
    }

    /** Determines the winner of the battle */
    getWinner() {
        if (this.activeChallengerCard.realPower <= 0) return this.challengedId;
        if (this.activeChallengedCard.realPower <= 0) return this.challengerId;
        return null;
    }

    /** Ends the battle and announces the winner */
    async endBattle(winnerId) {
        try {
            const winner = await this.getPlayerFromId(winnerId);
            const embed = new EmbedBuilder()
                .setTitle(`${winner.user.username} Wins!`)
                .setColor("#3498DB");

            const channel = await this.getBattleChannel();
            await channel.send({ embeds: [embed] });

            // Clean up messages
            for (const msgId of Object.values(this.battleMessages)) {
                try {
                    const message = await channel.messages.fetch(msgId);
                    if (message) await message.delete();
                } catch (err) {
                    console.error(
                        `Error deleting message ${msgId}: ${err.message}`
                    );
                }
            }

            await this.rewardPlayers(winnerId);
            await this.updateBattleConclusion(winnerId);
        } catch (error) {
            console.error(`Error ending battle: ${error.message}`);
            throw error;
        }
    }

    /**
     * Updates the battle conclusion details in the database.
     *
     * @param {string} winnerId - The ID of the winner.
     */
    async updateBattleConclusion(winnerId) {
        try {
            const loserId =
                winnerId === this.challengerId
                    ? this.challengedId
                    : this.challengerId;
            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                {
                    $set: {
                        status: BattleStatus.FINISHED,
                        winner_id: winnerId,
                        loser_id: loserId,
                        finished_at: new Date(),
                    },
                }
            );
            this.status = BattleStatus.FINISHED;
            this.winner_id = winnerId;
            this.loser_id = loserId;
            this.finished_at = new Date().toISOString();
        } catch (error) {
            console.error(`Error updating battle conclusion: ${error.message}`);
            throw error;
        }
    }

    /** Reward users for win/loss */
    async rewardPlayers(winnerId) {
        const loserId =
            winnerId === this.challengerId
                ? this.challengedId
                : this.challengerId;

        await this.rewardUser(winnerId, 1); // 1 for win
        await this.rewardUser(loserId, -1); // -1 for loss
    }

    /** Helper to reward a user */
    async rewardUser(userId, increment) {
        try {
            const column = increment > 0 ? "wins" : "losses";
            await this.battlesQuery.updateOne(
                { _id: this.battleId },
                { $inc: { [`${this.guildId}_users.${column}`]: 1 } }
            );
        } catch (error) {
            console.error(`Error rewarding user ${userId}: ${error.message}`);
            throw error;
        }
    }

    /** Fetch the battle channel */
    async getBattleChannel() {
        try {
            const guild = await this.getGuild();
            if (!guild) return null;
            const channel = guild.channels.cache.find(
                (channel) => channel.name === "battle-channel"
            );
            if (!channel) {
                console.error("Battle channel not found.");
            }
            return channel;
        } catch (error) {
            console.error(`Error fetching battle channel: ${error.message}`);
            return null;
        }
    }

    /** Creates the control buttons for moves */
    createControlButtons() {
        const row = new ActionRowBuilder();
        for (let i = 0; i < 3; i++) {
            row.addComponents(
                new ButtonBuilder()
                    .setCustomId(`move_${i}_${this.battleId}`)
                    .setLabel(`Move ${i + 1}`)
                    .setStyle(ButtonStyle.Primary)
            );
        }
        row.addComponents(
            new ButtonBuilder()
                .setCustomId(`change_card_${this.battleId}`)
                .setLabel("Change Card")
                .setStyle(ButtonStyle.Danger)
        );
        return row;
    }
}

/**
 * Card class represents a player's card with all necessary properties and methods.
 */
class Card {
    constructor(data, moveSet) {
        this.id = data.card_id || data._id; // MongoDB uses _id
        this.Name = data.Name;
        this.category = data.category;
        this.Damage = data.dmg;
        this.Specialcategory = data.specialcategory;
        this.OwnModifier = data.ownModifier;
        this.OtherModifier = data.otherModifier;
        this.Power = data.Power;
        this.vr = data.vr;
        this.Rank = data.Rank;
        this.OwnerId = data.player_id;
        this.Starter = data.inGroup;
        this.MoveSet = moveSet;
        this.realPower = data.realPower || data.realPower; // Ensure 'realPower' is a field
    }
    async cloneCard() {
        return new card(this);
    }
    /**
     * Static method to fetch multiple cards by their IDs.
     * @param {Array<string>} cardIds - Array of card IDs.
     * @param {string} guildId - The ID of the guild.
     * @returns {Promise<Array<Card>>}
     */
    static async getCardsByIds(cardIds, guildId) {
        if (!cardIds.length) return [];

        try {
            const ownedCardsQuery = new Query(`${guildId}_owned_Cards`);
            const animeCardListQuery = new Query("animeCardList");

            // Fetch owned card data
            const ownedCards = await ownedCardsQuery.readMany({
                card_id: { $in: cardIds },
            });

            if (!ownedCards.length) return [];

            // Extract anime card IDs from owned cards
            const animeCardIds = ownedCards.map((card) => card.card_id);

            // Fetch anime card details
            const animeCards = await animeCardListQuery.readMany({
                id: { $in: animeCardIds },
            });

            // Create a map for quick lookup
            const animeCardMap = {};
            animeCards.forEach((ac) => {
                animeCardMap[ac.id] = ac;
            });

            // Fetch move sets for each card
            const cards = await Promise.all(
                ownedCards.map(async (oc) => {
                    const animeCard = animeCardMap[oc.card_id];
                    if (!animeCard) {
                        console.warn(
                            `Anime card with ID ${oc.card_id} not found.`
                        );
                        return null;
                    }
                    const moveSet = await Card.getMovesForCard(
                        animeCard.move_ids
                    );
                    return new Card(
                        {
                            ...oc,
                            ...animeCard,
                        },
                        moveSet
                    );
                })
            );

            // Filter out any null values due to missing anime cards
            return cards.filter((card) => card !== null);
        } catch (error) {
            console.error(`Error fetching cards by IDs: ${error.message}`);
            throw error;
        }
    }

    /**
     * Static method to fetch move sets for a card by move IDs.
     * @param {string} move_ids - Comma-separated string of move IDs.
     * @returns {Promise<Array<Move>>}
     */
    static async getMovesForCard(move_ids) {
        if (!move_ids) return [];

        try {
            const moveIdArray = move_ids.split(",").map((id) => id.trim());
            const animeCardMovesQuery = new Query("animeCardMoves");

            // Fetch move data
            const movesData = await animeCardMovesQuery.readMany({
                moveId: { $in: moveIdArray.map((id) => parseInt(id, 10)) },
            });

            // Instantiate Move objects
            const moves = movesData.map((moveData) => new Move(moveData));
            return moves;
        } catch (error) {
            console.error(`Error fetching moves for card: ${error.message}`);
            throw error;
        }
    }

    /**
     * Static method to fetch a user's owned cards.
     * @param {string} userId - The ID of the user.
     * @param {string} guildId - The ID of the guild.
     * @returns {Promise<Array<Card>>}
     */
    static async getUserCards(userId, guildId) {
        try {
            const ownedCardsQuery = new Query(`${guildId}_owned_Cards`);
            const animeCardListQuery = new Query("animeCardList");

            // Fetch owned cards for the user
            const ownedCards = await ownedCardsQuery.readMany({
                player_id: userId,
            });

            if (!ownedCards.length) return [];

            // Extract anime card IDs
            const animeCardIds = ownedCards.map((card) => card.card_id);

            // Fetch anime card details
            const animeCards = await animeCardListQuery.readMany({
                id: { $in: animeCardIds },
            });

            // Create a map for quick lookup
            const animeCardMap = {};
            animeCards.forEach((ac) => {
                animeCardMap[ac.id] = ac;
            });

            // Fetch move sets for each card
            const cards = await Promise.all(
                ownedCards.map(async (oc) => {
                    const animeCard = animeCardMap[oc.card_id];
                    if (!animeCard) {
                        console.warn(
                            `Anime card with ID ${oc.card_id} not found.`
                        );
                        return null;
                    }
                    const moveSet = await Card.getMovesForCard(
                        animeCard.move_ids
                    );
                    return new Card(
                        {
                            ...oc,
                            ...animeCard,
                        },
                        moveSet
                    );
                })
            );

            // Filter out any null values due to missing anime cards
            return cards.filter((card) => card !== null);
        } catch (error) {
            console.error(`Error fetching user cards: ${error.message}`);
            throw error;
        }
    }

    /**
     * Returns a formatted string of the card's details.
     * @returns {string} - Formatted card details.
     */
    getDetails() {
        return `
**Name:** ${this.Name}
**Category:** ${this.category}
**Damage:** ${this.Damage}
**Special Category:** ${this.Specialcategory}
**Own Modifier:** ${this.OwnModifier}
**Other Modifier:** ${this.OtherModifier}
**Power:** ${this.Power}
**Rank:** ${this.Rank}
**Move Set:** ${this.MoveSet.map((move) => move.moveName).join(", ")}
        `;
    }

    /**
     * Returns an EmbedBuilder object representing the card.
     * @returns {EmbedBuilder} - The embed with card details.
     */
    toEmbed() {
        return new EmbedBuilder()
            .setTitle(this.Name)
            .setDescription(this.getDetails())
            .addFields(
                { name: "Category", value: this.category, inline: true },
                { name: "Damage", value: `${this.Damage}`, inline: true },
                {
                    name: "Special Category",
                    value: this.Specialcategory,
                    inline: true,
                },
                { name: "Power", value: `${this.Power}`, inline: true },
                { name: "Rarity", value: this.getRarity(), inline: true },
                {
                    name: "Move Set",
                    value: this.MoveSet.map((move) => move.moveName).join(", "),
                    inline: false,
                }
            )
            .setColor("#FF0000"); // Example color
    }

    /**
     * Returns the rarity designation based on the card's rank.
     * @returns {string} - The rarity designation.
     */
    getRarity() {
        if (this.Rank <= 2) {
            return "B";
        } else if (this.Rank <= 3) {
            return "A";
        } else if (this.Rank <= 4) {
            return "S";
        } else if (this.Rank <= 5) {
            return "S+";
        } else {
            return "C";
        }
    }

    // Additional methods related to Card can be added here.
}

/**
 * Move class represents a move associated with a card.
 */
class Move {
    /**
     * Constructor for a Move.
     * @param {Object} data - The move data.
     * @param {number} data.moveId - The ID of the move.
     * @param {number} data.cardId - The ID of the card this move belongs to.
     * @param {string} data.moveName - The name of the move.
     * @param {string} data.moveDescription - The description of the move.
     * @param {string} data.moveType - The type/category of the move.
     * @param {number} data.baseDMG - The base damage value of the move.
     * @param {number} data.version - The version of the move.
     * @param {number} data.specialDMG - Special damage, if any.
     * @param {number} data.ownModifier - Modifier affecting the user.
     * @param {number} data.otherModifier - Modifier affecting the opponent.
     */
    constructor(data) {
        this.moveId = data.moveId;
        this.cardId = data.cardId;
        this.moveName = data.moveName;
        this.moveDescription = data.moveDescription;
        this.moveType = data.moveType;
        this.baseDMG = data.baseDMG;
        this.version = data.version;
        this.specialDMG = data.specialDMG;
        this.ownModifier = data.ownModifier;
        this.otherModifier = data.otherModifier;
    }

    /**
     * Calculates the effective damage of this move.
     * @param {number} cardPower - The card's power that affects the damage.
     * @returns {number} - The effective damage.
     */
    calculateDamage(cardPower) {
        return (
            (this.baseDMG + this.specialDMG) *
            (cardPower / 100) *
            this.ownModifier
        );
    }

    /**
     * Returns an EmbedBuilder object representing the move.
     * @returns {EmbedBuilder} - The embed with move details.
     */
    toEmbed() {
        return new EmbedBuilder()
            .setTitle(this.moveName)
            .setDescription(this.moveDescription)
            .addFields(
                { name: "Type", value: this.moveType, inline: true },
                { name: "Base Damage", value: `${this.baseDMG}`, inline: true },
                {
                    name: "Special Damage",
                    value: `${this.specialDMG || 0}`,
                    inline: true,
                },
                {
                    name: "Own Modifier",
                    value: `${this.ownModifier}`,
                    inline: true,
                },
                {
                    name: "Other Modifier",
                    value: `${this.otherModifier}`,
                    inline: true,
                }
            )
            .setColor("#FF69B4"); // Example color
    }
}

module.exports = {
    BattleStatus,
    Card,
    Battle,
    Move,
};
