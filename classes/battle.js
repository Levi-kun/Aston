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
const { ObjectId } = require("mongodb");
const bot = require("../client.js");
const client = bot;

const BattleStatus = Object.freeze({
	PENDING: "pending",
	DENIED: "denied",
	ON_GOING: "on_going",
	FINISHED: "finished",
	FORFEIT: "forfeit",
});

const moveTypes = Object.freeze({
	BUFF: "BUFF",
	DEBUFF: "DEBUFF",
	FOCUS: "FOCUS",
	SPECIAL: "SPECIAL",
});

// Queries for the new collections
const pvpBattleQuery = new Query("pvpBattles");
const pvpBattleTurnQuery = new Query("pvpBattleTurns");
const pvpBattleTelemetryQuery = new Query("pvpBattleTelemetry");

class Battle {
	constructor() {
		this._id;
		this.guild_id;
		this.challenger_id;
		this.challenged_id;
		this.status = BattleStatus.PENDING;
		this.created_at = new Date();
		this.channel_id;

		this.cards = [];
		this.current_turn = 0;

		this._localOnly = new Set();
		this._realtime_updates = false;

		return new Proxy(this, {
			set: async (target, prop, value) => {
				target[prop] = value;
				if (!this._realtime_updates) return true;
				if (prop.startsWith("_") && prop !== "_id") return true;
				if (prop === "_realtime_updates") return true;

				await this.updateBattle({ [prop]: value });
				return true;
			},
		});
	}

	// Updates the battle record in the pvpBattles collection
	async updateBattle(update) {
		if (!this._id) return;
		await pvpBattleQuery.updateOne({ _id: this._id }, { $set: update });
	}

	// Initializes a new battle in the pvpBattles collection
	async createBattle() {
		const battleData = {
			guild_id: this.guild_id,
			challenger_id: this.challenger_id,
			challenged_id: this.challenged_id,
			status: this.status,
			created_at: this.created_at,
			channel_id: this.channel_id,
			cards: this.cards.map((card) => card.toObject()), // Use Card class
			current_turn: this.current_turn,
		};

		const result = await pvpBattleQuery.insertOne(battleData);
		this._id = result.insertedId;

		await this.initializeTelemetry();
	}

	// Initializes a telemetry record in the pvpBattleTelemetry collection
	async initializeTelemetry() {
		const telemetryData = {
			battle_id: this._id,
			total_damage: 0,
			total_healing: 0,
			move_usage: {},
			card_switches: 0,
			focus_completed: 0,
			special_triggered: 0,
		};

		await pvpBattleTelemetryQuery.insertOne(telemetryData);
	}

	// Records a new turn in the pvpBattleTurns collection
	async recordTurn(actionData) {
		const turnData = {
			battle_id: this._id,
			turn_number: ++this.current_turn,
			action: actionData,
			timestamp: new Date(),
		};

		await pvpBattleTurnQuery.insertOne(turnData);
		await this.updateBattle({ current_turn: this.current_turn });
	}

	// Updates the telemetry record
	async updateTelemetry(updateData) {
		await pvpBattleTelemetryQuery.updateOne(
			{ battle_id: this._id },
			{ $inc: updateData }
		);
	}

	// Adds a card using the Card class
	async addCard(cardData, isChallenger) {
		const card = await Card.createFromData(cardData);
		card.isChallenger = isChallenger;
		this.cards.push(card);
	}

	// Handles a player forfeiting the battle
	async forfeit(loser_id) {
		const winner_id =
			this.challenger_id === loser_id
				? this.challenged_id
				: this.challenger_id;

		this.status = BattleStatus.FORFEIT;

		await this.updateBattle({
			status: BattleStatus.FORFEIT,
			winner_id: winner_id,
			loser_id: loser_id,
			finished_at: new Date(),
		});

		await this.updateTelemetry({ card_switches: 1 });
	}

	// Starts the battle and updates the status
	async startBattle() {
		this.status = BattleStatus.ON_GOING;
		await this.updateBattle({ status: BattleStatus.ON_GOING });
	}

	// Applies a move using the Card class
	async applyMove(userId, move) {
		const isChallenger = userId === this.challenger_id;
		const targetId = isChallenger ? this.challenged_id : this.challenger_id;

		let targetCard = this.cards.find(
			(c) => c.isChallenger !== isChallenger
		);
		let userCard = this.cards.find((c) => c.isChallenger === isChallenger);

		await userCard.applyMove(move, targetCard);

		await this.updateTelemetry({
			total_damage: move.type === "DEBUFF" ? move.value : 0,
			focus_completed: move.type === "FOCUS" ? 1 : 0,
			special_triggered: move.type === "SPECIAL" ? 1 : 0,
		});

		await this.recordTurn({
			userId,
			move,
			targetId,
			result: targetCard,
		});

		await this.updateBattle({
			cards: this.cards.map((card) => card.toObject()),
		});
	}
}

module.exports = { Battle, BattleStatus, moveTypes };
