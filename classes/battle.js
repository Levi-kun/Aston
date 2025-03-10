const { Query } = require("../databases/query.js");

// Initialize battle classes!

const battleMain = new Query("pvpBattles");
const battleTelemetry = new Query("pvpBattleTelemetry");
const pvpTurns = new Query("pvpBattleTurns");

const pvpCards = new Query("pvpCards");

const challengeStatus = Object.freeze({
	CREATED: "created",
	FAILED: "failed",
	SUCCESS: "success",
});

const BattleStatus = Object.freeze({
	FAILED: "failed",
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

class Battle {
	constructor(challenger, challenged) {
		this.challenger = challenger.id;
		this.challenged = challenged.id;
		this.guild_id = challenger.guild.id;
		this.created_at = new Date();
	}

	async EntryExists() {
		let data = {
			guild_id: this.guild_id,
			$or: [
				{
					$and: [
						{ challenger_id: this.challenger.id },
						{ challenged_id: this.challenged.id },
					],
				},
				{
					$and: [
						{ challenger_id: this.challenged.id },
						{ challenged_id: this.challenger.id },
					],
				},
			],
		};

		let checker = await battleMain.readMany(data);

		let mostRecent = null;
		for (const game of checker) {
			if (
				mostRecent === null ||
				game.created_at > mostRecent.created_at // Grabs most recent
			) {
				mostRecent = game; // this will be the most recent game in the loop
			}
		}

		return mostRecent;
	}

	/*

	Insert Functions

	*/
	async insertCard(player_id, cards) {
		search = {
			main_id: this.id,
			player_id: player_id,
		};
		data = { cards: Array.isArray(cards) ? [...cards] : [] };
		try {
			pvpCards.updateOne(search, data);
		} catch (e) {
			console.error("Error in insertCard: " + e);
		}
	}
	async insertTurn(data) {
		pvpTurns.insertOne(data);
	}
	/*

	End of Insert Functions

	 */

	/* 
	
	Initialize Functions
	
	*/
	async initMain() {
		data = {
			guild_id: this.guild_id,
			challenger_id: this.challenger,
			challenged_id: this.challenged,
			status: BattleStatus.PENDING,
			created_at: new Date(),
		};

		try {
			const result = await battleMain.insertOne(data);
			this._id = result.insertedId;
			return result;
		} catch (e) {
			console.error("Error in initMain: " + e);
			return 0;
		}
	}
	async initCards(player_id) {
		data = { player_id: player_id, main_id: this._id };
		await pvpCards.insertOne(data);
	}
	async initTelemetry(player_id) {
		data = {
			battle_id: this._id,
			player_id: player_id,
			totalTurns: 0,
			totalDamageDealt: 0,
			totalHealingDone: 0,
			totalCardSwitches: 0,
			totalFocusCompleted: 0,
			totalSpecialTriggered: 0,
			averageTurnDuration: 0,
			moveFrequency: [],
		};

		await battleTelemetry.insertOne(data);
	}
	async initAll(player_id) {
		this.initMain();
		this.initTelemetry();
		this.initCards(player_id);
	}
	/* 
	
	End of Initialize Functions
	
	*/
}

(module.exports = Battle), BattleStatus;
