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
	FORFEIT: "forfeit",
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
	// Move static properties outside the constructor
	static _pvpBattlesQuery = new Query("pvpBattles");

	constructor(battleData) {
		// ID information
		this._id = battleData._id;
		this.guild_id = battleData.guild_id;

		this.challenger_id = battleData.challenger_id;
		this.challenger_cards = battleData.challenger_cards;

		this.challenged_id = battleData.challenged_id;
		this.challenged_cards = battleData.challenged_cards;

		this.status = battleData.status || BattleStatus.PENDING;
		this.created_at = battleData.created_at || new Date();
		this.current_turn = battleData.current_turn || null;

		this._localOnly = new Set();
		this._previousState = {};

		this._currentmessage = "";
		this._messageHistory = [];

		return new Proxy(this, {
			set: async (target, prop, value) => {
				if (this._localOnly.has(prop) || target[prop] === value) {
					target[prop] = value;
					return true;
				}
				target[prop] = value;
				if (!prop.startsWith("_")) {
					try {
						await Battle._pvpBattlesQuery.updateOne(
							{ _id: this._id },
							{ $set: { [prop]: value } }
						);
					} catch (error) {
						console.error("Error updating battle:", error);
					}
				}
				return true;
			},
		});
	}

	_lockProperty(prop) {
		this._localOnly.add(prop);
	}

	_unlockProperty(prop) {
		this._localOnly.delete(prop);
	}

	static async createBattle(
		guild_id,
		challenger_id,
		challenged_id,
		state = BattleStatus.PENDING
	) {
		if (state === BattleStatus.FORFEIT) {
			const data = {
				$or: [
					{ challenged_id: challenged_id },
					{ challenger_id: challenged_id },
				],
				guild_id: guild_id,
			};
			const existingBattle = await Battle._pvpBattlesQuery.checkOne(data);
			if (existingBattle) {
				const existingData = Battle._pvpBattlesQuery.readOne(data);
				return new Battle(existingData);
			}
			return "No forfeit battle found.";
		}
		if (state === "start") {
			const data = {
				$or: [
					{ challenged_id: challenged_id },
					{ challenger_id: challenged_id },
				],
				guild_id: guild_id,
			};
			const existingBattle = await Battle._pvpBattlesQuery.readOne(data);
			if (existingBattle && Object.keys(existingBattle).length > 0) {
				return "You already issued a challenge to this user.";
			}

			state = "pending";
		}

		try {
			const data = {
				$or: [
					{ challenged_id: challenged_id },
					{ challenger_id: challenged_id },
				],
				guild_id: guild_id,
			};

			const existingBattle = await Battle._pvpBattlesQuery.readOne(data);
			if (existingBattle && Object.keys(existingBattle).length > 0) {
				return new Battle(existingBattle);
			}

			const newBattleData = {
				challenger_id: challenger_id,
				challenged_id: challenged_id,
				guild_id: guild_id,
				status: state,
				created_at: new Date(),
			};

			const result = await Battle._pvpBattlesQuery.insertOne(
				newBattleData
			);
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
			console.error("Error fetching cards:", error);
			return;
		}
	}

	async updateStatus(status) {
		if (status in BattleStatus) {
			this._unlockProperty(status);
			this.status = status;
			this._lockProperty(status);
		}
	}

	async cancelBattle() {
		this._localOnly.clear();
		await this.updateStatus(BattleStatus.DENIED);
	}

	async forfeit(loserid) {
		const winner_id =
			this.challenger_id === loserid
				? this.challenged_id
				: this.challenger_id;

		this.updateStatus(BattleStatus.FINISHED);
		this._localOnly.clear();
		this.winner_id = winner_id;
		this.loser_id = loserid;
		this.finished_at = new Date();

		try {
			userQuery = new Query("userDataBase");

			userQuery.update(
				{ id: loserid, _guildId: this.guild_id },
				{ $set: { inc: { loses: 1 } } }
			);
			userQuery.update(
				{ id: winner_id, _guildId: this.guild_id },
				{ $set: { inc: { wins: 1 } } }
			);
		} catch (error) {
			console.error("Error updating user statistics:", error);
		}
	}

	/**
	 * Starts the battle and sets the status to ON_GOING.
	 * This function locks the status property to prevent unauthorized updates.
	 * It then enters a loop where the actual battle logic is implemented.
	 *
	 * @returns {Promise<void>} A Promise that resolves when the battle is finished.
	 */
	async startBattle() {
		this.updateStatus(BattleStatus.ON_GOING);
		while (this.status === BattleStatus.ON_GOING) {
			// Battle logic goes here
		}
	}

	/**
	 * Chooses a player to go first in the battle.
	 *
	 * @returns {string} The ID of the player who goes first.
	 */
	chooseWhoGoesFirst() {
		const candidate =
			Math.random() > 0.5 ? this.challenger_id : this.challenged_id;
		this.current_turn = candidate;
		return candidate;
	}
}

module.exports = { Battle, BattleStatus, moveTypes };
