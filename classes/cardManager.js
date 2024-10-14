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

const moveTypes = Object.freeze({
    DMG: "DMG",
    SPECIAL: "SPECIAL",
    BUFF: "BUFF",
    DEBUFF: "DEBUFF",
    PASSIVE: "PASSIVE",
    FOCUS: "FOCUS",
});

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
    Card,
    Move,
};
