const { Collection, Guild } = require("discord.js");
const sqlite3 = require("sqlite3");
const util = require("util");
const bot = require("../client.js");

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
        this.currentTurn = 'challenger'; // Default turn

        this.challengerCards = JSON.parse(battleData.challenger_cards || "[]");
        this.challengedCards = JSON.parse(battleData.challenged_cards || "[]");
        this.battleMessages = {}; // Tracks message IDs
        this.lastMove = ''; // Stores the description of the last move
    }
    
    
    static async createBattle(guildId, challengerId, challengedId) {
        try {
            // Insert a new battle entry into the database with a default 'pending' status
            const insertBattleQuery = `
                INSERT INTO pvpBattles (guild_id, challenger_id, challenged_id, status)
                VALUES (?, ?, ?, 'pending')
            `;

            await dbRunAsync(insertBattleQuery, [guildId, challengerId, challengedId]);

            // Retrieve the newly created battle ID
            const selectQuery = `
                SELECT battle_id 
                FROM pvpBattles 
                WHERE guild_id = ? AND challenger_id = ? AND challenged_id = ? 
                ORDER BY battle_id DESC LIMIT 1
            `;
            const result = await dbGetAsync(selectQuery, [guildId, challengerId, challengedId]);

            if (!result) throw new Error('Failed to retrieve the created battle.');

            // Return a new Battle instance using the retrieved battleId
            return new Battle(result.battle_id, guildId, challengerId, challengedId);
        } catch (error) {
            console.error(`Error creating battle: ${error.message}`);
            throw error;
        } finally {
            db.close();
        }
    }


    /** Helper to get a player by ID */
    async getPlayerFromId(id) {
        return this.getGuild().members.fetch(id);
    }

    /** Fetch guild from cache or Discord API */
    async getGuild() {
        const guild = bot.guilds.cache.get(this.guildId) || await bot.guilds.fetch(this.guildId);
        if (!guild) {
            console.error(`Guild with ID ${this.guildId} not found`);
            return null;
        }
        return guild;
    }

    /** Save battle turn and status updates */
    async updateTurnAndStatus(newStatus = this.status) {
        const query = `UPDATE pvpBattles SET current_turn = ?, status = ? WHERE battle_id = ?`;
        await dbRunAsync(query, [this.currentTurn, newStatus, this.battleId]);
        this.status = newStatus;
    }

    /** Initializes battle and selects who goes first */
    async initializeBattle(challengerCards, challengedCards) {
        this.challengerCards = await Card.getCardsByIds(challengerCards, this.guildId);
        this.challengedCards = await Card.getCardsByIds(challengedCards, this.guildId);

        this.activeChallengerCard = this.challengerCards[0];
        this.activeChallengedCard = this.challengedCards[0];

        await this.chooseFirstPlayer();
        await this.startBattleLoop();
    }

    /** Determines who goes first */
    async chooseFirstPlayer() {
        const firstPlayer = Math.random() < 0.5 ? this.challengerId : this.challengedId;
        this.currentTurn = firstPlayer;
    }

    /** Main battle loop */
    async startBattleLoop() {
        await this.sendFieldUpdate();
        await this.sendTurnPrompt();
    }

    /** Send a turn prompt to the active player */
    async sendTurnPrompt() {
        const currentPlayer = this.currentTurn === 'challenger' ? this.challengerId : this.challengedId;
        const player = await this.getPlayerFromId(currentPlayer);
        const row = this.createControlButtons();

        const dmChannel = await player.createDM();
        await dmChannel.send({
            content: `Your turn!`,
            components: [row],
        });
    }

    /** Handle move made by player */
    async handleMove(playerId, moveId) {
        const isChallenger = playerId === this.challengerId;
        const activeCard = isChallenger ? this.activeChallengerCard : this.activeChallengedCard;
        const move = activeCard.MoveSet[moveId];

        this.lastMove = `${activeCard.Name} uses ${move.name}`;
        this.currentTurn = isChallenger ? this.challengedId : this.challengerId;

        await this.updateTurnAndStatus();
        await this.sendFieldUpdate();
        await this.startBattleLoop(); // Continue battle
    }

    /** Sends an update to the battle field */
    async sendFieldUpdate() {
        const embed = this.generateFieldEmbed();
        const channel = await this.getBattleChannel();

        if (this.battleMessages.fieldMessage) {
            const message = await channel.messages.fetch(this.battleMessages.fieldMessage);
            await message.edit({ embeds: [embed] });
        } else {
            const message = await channel.send({ embeds: [embed] });
            this.battleMessages.fieldMessage = message.id;
        }
    }

    /** Generate an embed for the battle field */
    generateFieldEmbed() {
        return {
            title: "Battlefield",
            description: `Challenger's Card: ${this.activeChallengerCard.Name} | Power: ${this.activeChallengerCard.realPower}\nChallenged's Card: ${this.activeChallengedCard.Name} | Power: ${this.activeChallengedCard.realPower}`,
            color: 0x2ECC71,
        };
    }

    /** Determines the winner of the battle */
    getWinner() {
        if (this.challengerCards.length === 0) return this.challengedId;
        if (this.challengedCards.length === 0) return this.challengerId;
        return null;
    }

    /** Ends the battle and announces the winner */
    async endBattle(winnerId) {
        const winner = await this.getPlayerFromId(winnerId);
        const embed = { title: `${winner.username} Wins!`, color: 0x3498DB };

        const channel = await this.getBattleChannel();
        await channel.send({ embeds: [embed] });

        // Clean up messages
        for (const msgId of Object.values(this.battleMessages)) {
            const message = await channel.messages.fetch(msgId);
            if (message) await message.delete();
        }

        await this.rewardPlayers(winnerId);
        await this.updateTurnAndStatus('ended');
    }

    /** Reward users for win/loss */
    async rewardPlayers(winnerId) {
        const loserId = winnerId === this.challengerId ? this.challengedId : this.challengerId;

        await this.rewardUser(winnerId, 1); // 1 for win
        await this.rewardUser(loserId, -1); // -1 for loss
    }

    /** Helper to reward a user */
    async rewardUser(userId, increment) {
        const column = increment > 0 ? "wins" : "losses";
        const query = `UPDATE ${this.guildId}_users SET ${column} = ${column} + 1 WHERE user_id = ?`;
        await dbRunAsync(query, [userId]);
    }

    /** Fetch the battle channel */
    async getBattleChannel() {
        const guild = await this.getGuild();
        return guild.channels.cache.find(channel => channel.name === 'battle-channel');
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
            new ButtonBuilder().setCustomId(`change_card_${this.battleId}`).setLabel("Change Card").setStyle(ButtonStyle.Danger)
        );
        return row;
    }
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
