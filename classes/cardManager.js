
const { Collection } = require("discord.js");
const sqlite3 = require("sqlite3")
const util = require("util");

// Initialize and connect to the SQLite database
const animedb = new sqlite3.Database("databases/animeDataBase.db");
const eventEmitter = require("../src/eventManager");

// Promisify db methods
const dbAllAsync = util.promisify(animedb.all.bind(animedb));
const dbGetAsync = util.promisify(animedb.get.bind(animedb));
const dbRunAsync = util.promisify(animedb.run.bind(animedb));


class Battle {
    constructor(battleData) {
        this.battleId = battleData.battle_id;
        this.guildId = battleData.guild_id;
        this.challengerId = battleData.challenger_id;
        this.challengedId = battleData.challenged_id;
        this.status = battleData.status;
        this.currentTurn = battleData.current_turn;
        this.challengerCards = JSON.parse(battleData.challenger_cards || "[]");
        this.challengedCards = JSON.parse(battleData.challenged_cards || "[]");
        this.challengerPowers = JSON.parse(battleData.challenger_powers || "[]");
        this.challengedPowers = JSON.parse(battleData.challenged_powers || "[]");
    }

    /**
     * Creates a new battle entry in the database.
     * @param {string} guildId 
     * @param {string} challengerId 
     * @param {string} challengedId 
     * @returns {Promise<Battle>}
     */
    static async createBattle(guildId, challengerId, challengedId) {
        const query = `
            INSERT INTO pvpBattles (guild_id, challenger_id, challenged_id, current_turn, status)
            VALUES (?, ?, ?, 0, 'pending')
        `;
        const result = await dbRunAsync(query, [guildId, challengerId, challengedId])
    }

    /**
     * Retrieves a battle from the database by its ID.
     * @param {number} battleId 
     * @returns {Promise<Battle|null>}
     */
    static async getBattleById(battleId) {
        const query = `SELECT * FROM pvpBattles WHERE battle_id = ?`;
        const row = await dbGetAsync(query, [battleId])
        if (row) {
            return new Battle(row);
        }
        return null;
    }

    /**
     * Retrieves an ongoing battle for a user in a guild.
     * @param {string} guildId 
     * @param {string} userId 
     * @returns {Promise<Battle|null>}
     */
    static async getOngoingBattle(guildId, userId) {
        const query = `
            SELECT * FROM pvpBattles 
            WHERE guild_id = ? 
              AND (challenger_id = ? OR challenged_id = ?) 
              AND status = 'ongoing'
        `;
        const row = await dbGetAsync(query, [guildId, userId, userId]);
        if (row) {
            return new Battle(row);
        }
        return null;
    }

    /**
     * Updates the battle status.
     * @param {string} newStatus 
     * @returns {Promise<void>}
     */
    async updateStatus(newStatus) {
        const query = `UPDATE pvpBattles SET status = ? WHERE battle_id = ?`;
        await dbRunAsync(query, [newStatus, this.battleId]);
        this.status = newStatus;
    }

    /**
     * Handles a forfeit action.
     * @param {string} loserId 
     * @returns {Promise<{winnerId: string, battle: Battle}>}
     */
    async forfeit(loserId) {
        if (![this.challengerId, this.challengedId].includes(loserId)) {
            throw new Error("User is not part of this battle.");
        }

        const winnerId = this.challengerId === loserId ? this.challengedId : this.challengerId;
        await this.updateStatus(winnerId); // Assuming 'status' can hold winnerId
        return { winnerId, battle: this };
    }

    /**
     * Initializes the battle by setting it to 'ongoing' and optionally assigning selected cards.
     * @param {Array<number>} challengerCardIds 
     * @param {Array<number>} challengedCardIds 
     * @param {Array<number>} challengerPowers 
     * @param {Array<number>} challengedPowers 
     * @returns {Promise<void>}
     */
    async initializeBattle(challengerCardIds, challengedCardIds, challengerPowers, challengedPowers) {
        const query = `
            UPDATE pvpBattles 
            SET status = 'ongoing',
                challenger_cards = ?,
                challenged_cards = ?,
                challenger_powers = ?,
                challenged_powers = ?
            WHERE battle_id = ?
        `;
        await dbRunAsync(query, [
            JSON.stringify(challengerCardIds),
            JSON.stringify(challengedCardIds),
            JSON.stringify(challengerPowers),
            JSON.stringify(challengedPowers),
            this.battleId
        ]);
        this.status = 'ongoing';
        this.challengerCards = challengerCardIds;
        this.challengedCards = challengedCardIds;
        this.challengerPowers = challengerPowers;
        this.challengedPowers = challengedPowers;
    }

    /**
     * Generates an embed representing the current state of the battle.
     * @param {Client} client - The Discord client.
     * @returns {Promise<EmbedBuilder>}
     */
    async generateBattleEmbed(client) {
        const challenger = await client.users.fetch(this.challengerId);
        const challenged = await client.users.fetch(this.challengedId);

        // Fetch Card details
        const challengerCards = await Card.getCardsByIds(this.challengerCards, this.guildId);
        const challengedCards = await Card.getCardsByIds(this.challengedCards, this.guildId);

        const embed = new EmbedBuilder()
            .setTitle("PvP Battle")
            .setDescription("The battle is in progress!")
            .setColor("#931ea8")
            .setTimestamp();

        // Challenger's Cards
        const challengerField = challengerCards
            .map((card, index) => `**${card.Name}**\nPower: ${this.challengerPowers[index]}`)
            .join("\n\n");

        // Challenged's Cards
        const challengedField = challengedCards
            .map((card, index) => `**${card.Name}**\nPower: ${this.challengedPowers[index]}`)
            .join("\n\n");

        embed.addFields(
            {
                name: `${challenger.username}'s Cards`,
                value: challengerField || "No cards selected.",
                inline: true,
            },
            {
                name: `${challenged.username}'s Cards`,
                value: challengedField || "No cards selected.",
                inline: true,
            }
        );

        return embed;
    }

    // Additional methods like handling turns, calculating results, etc., can be added here.
}



/**
 * Card class represents a player's card with all necessary properties and methods.
 */
class Card {
    constructor(data, moveSet) {
        this.id = data.id;
        this.Name = data.Name;
        this.Description = data.Description;
        this.Type = data.type;
        this.Damage = data.dmg;
        this.SpecialType = data.specialType;
        this.OwnModifier = data.ownModifier;
        this.OtherModifier = data.otherModifier;
        this.Power = data.Power;
        this.vr = data.vr;
        this.Rank = data.Rank;
        this.OwnerId = data.playerid;
        this.Starter = data.inGroup;
        this.MoveSet = moveSet;
        this.realPower = data.realPower; // Assuming 'realPower' is a field
    }

    /**
     * Static method to fetch multiple cards by their IDs.
     * @param {Array<number>} cardIds 
     * @param {string} guildId 
     * @returns {Promise<Array<Card>>}
     */
    static async getCardsByIds(cardIds, guildId) {
        if (!cardIds.length) return [];

        const placeholders = cardIds.map(() => '?').join(',');
        const query = `
            SELECT oc.card_id as id, acl.Name, acl.Description, acl.type, acl.dmg, acl.specialType, 
                   acl.ownModifier, acl.otherModifier, oc.realPower, acl.Power, oc.vr, oc.rank, 
                   oc.player_id, oc.inGroup
            FROM "${guildId}_owned_Cards" oc
            JOIN animeCardList acl ON oc.card_id = acl.id
            WHERE oc.card_id IN (${placeholders}) AND oc.guild_id = ?
        `;
        const rows = await dbAllAsync(query, [...cardIds, guildId]);

        const cards = rows.map(row => new Card(row, [])); // Assuming moveSet is handled elsewhere
        return cards;
    }

    /**
     * Static method to fetch a user's owned cards.
     * @param {string} userId 
     * @param {string} guildId 
     * @returns {Promise<Array<Card>>}
     */
    static async getUserCards(userId, guildId) {
        const query = `
            SELECT oc.card_id as id, acl.Name, acl.Description, acl.type, acl.dmg, acl.specialType, 
                   acl.ownModifier, acl.otherModifier, oc.realPower, acl.Power, oc.vr, oc.rank, 
                   oc.player_id, oc.inGroup
            FROM "${guildId}_owned_Cards" oc
            JOIN animeCardList acl ON oc.card_id = acl.id
            WHERE oc.player_id = ? AND oc.guild_id = ?
        `;
        const rows = await dbAllAsync(query, [userId, guildId]);

        const cards = rows.map(row => new Card(row, [])); // MoveSet can be populated if needed
        return cards;
    }

    /**
     * Returns a formatted string of the card's details.
     * @returns {string} - Formatted card details.
     */
    getDetails() {
        return `
**Name:** ${this.Name}
**Description:** ${this.Description}
**Type:** ${this.Type}
**Damage:** ${this.Damage}
**Special Type:** ${this.SpecialType}
**Own Modifier:** ${this.OwnModifier}
**Other Modifier:** ${this.OtherModifier}
**Power:** ${this.Power}
**Rank:** ${this.Rank}
**Move Set:** ${this.MoveSet.join(", ")}
        `;
    }

    /**
     * Returns an EmbedBuilder object representing the card.
     * @returns {EmbedBuilder} - The embed with card details.
     */
    toEmbed() {
        return new EmbedBuilder()
            .setTitle(this.Name)
            .setDescription(this.Description)
            .addFields(
                { name: "Type", value: this.Type, inline: true },
                { name: "Damage", value: `${this.Damage}`, inline: true },
                { name: "Special Type", value: this.SpecialType, inline: true },
                { name: "Power", value: `${this.Power}`, inline: true },
                { name: "Rarity", value: this.getRarity(), inline: true },
                { name: "Move Set", value: this.MoveSet.join(", "), inline: false }
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

module.exports = {
    Card,
    Battle,
}
