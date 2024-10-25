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

const { monitorCollection } = require("../databases/expire.js");

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

	constructor() {
		// ID information
		this._id;
		this.guild_id;

		this.challenger_id;
		this.challenger_cards;

		this.challenged_id;
		this.challenged_cards;

		this.status;
		this.created_at;
		this.current_turn;

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
							{ [prop]: value }
						);
					} catch (error) {
						console.error("Error updating battle:", error);
					}
				}
				return true;
			},
		});
	}
	/*}
	 * 	}
	 * }
	 * }
	 *  Builder Functions for the Battle Object!
	 * }
	 * }
	 *  }
	 */

	addId(id) {
		this._id = id;
		return this;
	}

	addGuildId(guild_id) {
		this.guild_id = guild_id;

		return this;
	}

	addChallengerId(challenger_id) {
		this.challenger_id = challenger_id;
		return this;
	}
	addChallengerCards(challenger_cards) {
		if (!challenger_cards) challenger_cards = [];
		this.challenger_cards = challenger_cards;
		return this;
	}
	addChallengedId(challenged_id) {
		this.challenged_id = challenged_id || 0;
		return this;
	}
	addChallengedCards(challenged_cards) {
		if (!challenged_cards) challenged_cards = [];
		this.challenged_cards = challenged_cards;
		return this;
	}
	addStatus(status) {
		this.status = status;
		return this;
	}
	addCreatedAt(created_at) {
		if (!created_at) created_at = new Date();
		this.created_at = created_at;
		return this;
	}
	addCurrentTurn(current_turn) {
		if (!current_turn) current_turn = this.challenged_id; // Default value for current_turn is challenger_id
		this.current_turn = current_turn;
		return this;
	}
	addTurnCount(turnCount) {
		this.turnCount = turnCount;
		return this;
	}
	addFinishedAt(finished_at) {
		if (!finished_at) finished_at = new Date();
		this.finished_at = finished_at;
		return this;
	}
	//
	buildBattle(data) {
		const newBattle = new Battle()
			.addId(data._id)
			.addGuildId(data.guild_id)
			.addChallengerId(data.challenger_id)
			.addChallengerCards(data.challenger_cards)
			.addChallengedId(data.challenged_id)
			.addChallengedCards(data.challenged_cards)
			.addStatus(data.status)
			.addCreatedAt(data.created_at)
			.addCurrentTurn(data.current_turn)
			.addTurnCount(data.turnCount)
			.addFinishedAt(data.finished_at);
		console.log(newBattle);
		return newBattle;
	}

	async createBattleDocument() {
		// Build the document object
		const ownedCardDocument = {
			_id: this._id,
			guild_id: this.guild_id,
			challenger_id: this.challenger_id,
			challenger_cards: this.challenger_cards || [],
			challenged_id: this.challenged_id,
			challenged_cards: this.challenged_cards || [],
			status: this.status,
			created_At: new Date(),
		};

		const a = await ownedCardsQuery.insertOne(ownedCardDocument);
		ownedCardQuery.on("inserted", (data) => {
			monitorCollection(data);
		});
		return true;
	}
	// Methods for handling battle state transitions

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
		if (state === "start") {
			const data = {
				$or: [
					{ challenged_id: challenger_id },
					{ challenger_id: challenger_id },
				],
				guild_id: guild_id,
			};
			const existingBattle = await Battle._pvpBattlesQuery.checkOne(data);
			if (existingBattle) {
				return "You already issued a challenge to this user.";
			}

			state = "pending";
		}

		try {
			const data = {
				$or: [
					{ challenged_id: challenger_id },
					{ challenger_id: challenger_id },
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

			console.log("Creating new battle:", newBattleData);
			const result = await this.createBattleDocument(newBattleData);
			return new Battle.buildBattle(newBattleData);
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

	static async forfeit(guild_id, loser_id) {
		try {
			const query = {
				guild_id: guild_id,
				$or: [{ challenged_id: loser_id }, { challenger_id: loser_id }],
			};
			const userQuery = new Query("userDataBase");
			const pvpQuery = new Query("pvpBattles");
			const data = await pvpQuery.readOne(query);
			const initialize = new Battle();
			const battle = initialize.buildBattle(data);

			const winner_id =
				battle.challenger_id === loser_id
					? battle.challenged_id
					: battle.challenger_id;

			battle.updateStatus(BattleStatus.FINISHED);
			battle._localOnly.clear();
			battle.winner_id = winner_id;
			battle.loser_id = loser_id;
			battle.finished_at = new Date();

			const loserSearch = {
				id: battle.loser_id,
				_guild_id: battle.guild_id,
			};
			const loserQuery = { $inc: { loses: 1 } };

			const winnerSearch = {
				id: battle.winner_id,
				_guild_id: battle.guild_id,
			};
			const winnerQuery = { $inc: { wins: 1 } };

			const loser = userQuery.updateOne(loserSearch, loserQuery);
			const winner = userQuery.updateOne(winnerSearch, winnerQuery);

			return { loser, winner, battle };
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
