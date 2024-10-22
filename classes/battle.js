const {
	Collection,
	Guild,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require("discord.js");
const { Query } = require("../databases/query.js");
const { Card } = require("./cardManager.js");
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
		// ID information
		this._id = battleData._id; // The _id of the battle from the database
		this.guild_id = battleData.guild_id;

		this.challenger_id = battleData.challenger_id;
		this.challenger_cards = battleData.challenger_cards;

		this.challenged_id = battleData.challenged_id;
		this.challenged_cards = battleData.challenged_cards;

		this.status = battleData.status || BattleStatus.PENDING;
		this.created_at = battleData.created_at || new Date();
		this.current_turn = battleData.current_turn || null;

		this._localOnly = new Set(); // Locked properties that shouldn't trigger DB updates
		this._previousState = {}; // Track previous state to avoid redundant updates

		this._currentmessage = ""; // Message associated with the battle
		this._messageHistory = []; // History of messages for debugging

		return new Proxy(this, {
			set: async (target, prop, value) => {
				// Skip properties that are locked or unchanged
				if (this._localOnly.has(prop) || target[prop] === value) {
					target[prop] = value;
					return true;
				}

				// Update the property
				target[prop] = value;

				// Avoid updating database if the property starts with "_"
				if (!prop.startsWith("_")) {
					try {
						await this._pvpBattlesQuery.updateOne(
							{ _id: target._id }, // Find battle by ID
							{ $set: { [prop]: value } } // Update the changed property
						);
					} catch (error) {
						console.error("Error updating battle:", error);
					}
				}

				return true;
			},
		});
	}

	// Lock a property to make it local only
	_lockProperty(prop) {
		this._localOnly.add(prop);
	}

	// Unlock a property so it can trigger database updates
	_unlockProperty(prop) {
		this._localOnly.delete(prop);
	}

	// Static method to create a new battle instance
	static async createBattle(
		guild_id,
		challenger_id,
		challenged_id,
		state = BattleStatus.PENDING
	) {
		try {
			const data = {
				$or: [
					{ challenged_id: challenged_id },
					{ challenger_id: challenged_id },
				],
				guild_id: guild_id,
			};

			const pvpBattlesQuery = new Query("pvpBattles");
			// Check if battle already exists
			const existingBattle = await pvpBattlesQuery.readOne(data);
			if (Object.keys(existingBattle).length > 0) {
				// Return an existing battle instance
				return new Battle(existingBattle);
			}

			// Create a new battle document in the database
			const newBattleData = {
				challenger_id: challenger_id,
				challenged_id: challenged_id,
				guild_id: guild_id,
				challenger_cards: [],
				challenged_cards: [],
				status: state,
				created_at: new Date(),
			};

			const result = await this._pvpBattles.insertOne(newBattleData);
			return new Battle(result);
		} catch (error) {
			console.error("Error creating battle instance:", error);
			throw error;
		}
	}

	async initiateCardSelection(challenger, challenged, guild_id) {
		try {
			const challengerCards = await Card.getCardsForUser(
				challenger.id,
				guild_id
			);
			const challengedCards = await Card.getCardsForUser(
				challenged.id,
				guild_id
			);
		} catch (error) {
			console.error("Error fetching challenger's cards:", error);
			return;
		}
	}

	async updateStatus(status) {
		if (status in battleStatus) {
			this._unlockProperty(status);
			this.status = status;
			this._lockProperty(status);
		}
	}

	async cancelBattle() {
		this.updateStatus(BattleStatus.DENIED);

		this.delete();
	}

	async startBattle() {
		this.status = BattleStatus.ON_GOING;
		this.lockProperty(status);

		while (this.status === BattleStatus.ON_GOING) {}
	}

	chooseWhoChooseFirst() {
		const candidate =
			Math.random() > 0.5
				? this.battleData.challenger_id
				: this.battleData.challenged_id;
		this.current_turn = candidate;
		return candidate;
	}
}

module.exports = { Battle, BattleStatus, moveTypes };
