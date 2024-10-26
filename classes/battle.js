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
	constructor() {
		this._id;
		this.guild_id;

		this.challenger_id;
		this.challenged_id;

		this.status;
		this.created_at;
	}

	addid(id) {
		this._id = id;
		return this;
	}

	addguild_id(guild_id) {
		this.guild_id = guild_id;
		return this;
	}

	addchallenger_id(challenger_id) {
		this.challenger_id = challenger_id;
		return this;
	}

	addchallenged_id(challenged_id) {
		this.challenged_id = challenged_id;
		return this;
	}

	addcreated_at(created_at = new Date()) {
		this.created_at = created_at;
		return this;
	}

	addchallenger_cards(cards) {
		this.challenger_cards = cards.map((card) => new Card(card));
		return this;
	}

	addchallenged_cards(cards) {
		this.challenged_cards = cards.map((card) => new Card(card));
		return this;
	}

	addstatus(status) {
		this.status = status;
		return this;
	}

	addwinner_id(winner_id) {
		this.winner_id = winner_id;
		return this;
	}

	addloser_id(loser_id) {
		this.loser_id = loser_id;
		return this;
	}

	addchannel_id(channel_id) {
		this.channel_id = channel_id;
		return this;
	}

	static createNew(data) {
		const battle = new Battle();

		battle
			.addid(new ObjectId())
			.addguild_id(data.guild_id)
			.addchallenged_id(data.challenged_id)
			.addchallenger_id(data.challenger_id)
			.addcreated_at(data.created_at)
			.addstatus(data.status)
			.addchannel_id(data.channel_id);

		return battle;
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

	getBattleChannel() {
		return this.channel_id;
	}

	grabAllProperties(noId = false) {
		let data = {};
		for (let key in this) {
			if (this.hasOwnProperty(key)) {
				if (
					(key === "_id" ||
						key === "created_at" ||
						key === "channel_id") &&
					noId
				)
					continue;
				data[key] = this[key];
			}
		}
		console.log("Battle data:", data);
		return data;
	}

	async synchronizeWithDB() {
		const query = new Query("pvpBattles");
		let data = await query.readOne({ _id: this._id });
		if (Object.keys(data).length <= 0) {
			data = await query.insertOne(this.grabAllProperties());
		}
		return data;
	}
}

module.exports = { Battle, BattleStatus, moveTypes };
