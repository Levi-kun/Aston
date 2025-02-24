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
	DMG: "DMG",
	SPECIAL: "SPECIAL",
	BUFF: "BUFF",
	DEBUFF: "DEBUFF",
	PASSIVE: "PASSIVE",
	FOCUS: "FOCUS",
});

function grabMostRecentGame(array) {
	let mostRecent = null;
	for (const game of array) {
		if (mostRecent === null || game.created_at > mostRecent.created_at) {
			mostRecent = game;
		}
	}
	return mostRecent;
}

const pvpQ = new Query("pvpBattles");
class Battle {
	constructor() {
		this._id;
		this.guild_id;

		this.challenger_id;
		this.challenged_id;

		this.status;
		this.created_at;

		this._localOnly = new Set();
		this._realtime_updates = false;

		return new Proxy(this, {
			set: async (target, prop, value) => {
				target[prop] = value;
				if (!this._realtime_updates) return true;
				if (prop.startsWith("_") && !prop === "_id") return true;

				if (prop === "_realtime_updates") return true;

				const guild = client.guilds.cache.get(this.guild_id);
				if (!guild) return;
				const document = await pvpQ.updateOne(
					{ _id: this._id },
					{ [prop]: value }
				);

				return true;
			},
		});
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

	updateStatus(status) {
		this.status = status;
	}

	setLocalOnly(data) {}

	static createNew(data) {
		const battle = new Battle();

		battle
			.addguild_id(data.guild_id)
			.addchallenged_id(data.challenged_id)
			.addchallenger_id(data.challenger_id)
			.addcreated_at(data.created_at)
			.addstatus(data.status)
			.addchannel_id(data.channel_id);

		return battle;
	}

	static createOld(data) {
		const battle = new Battle();
		for (const key in data) {
			battle[key] = data[key];
		}

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

			const battle = Battle.createOld(data);

			const winner_id =
				battle.challenger_id === loser_id
					? battle.challenged_id
					: battle.challenger_id;

			battle.status = BattleStatus.FORFEIT;
			battle._localOnly.clear();
			battle.winner_id = winner_id;
			battle.loser_id = loser_id;
			battle.finished_at = new Date();
			let checker = await pvpQuery.readMany(battle.grabAllProperties());
			checker = grabMostRecentGame(checker);

			if (checker.status !== BattleStatus.ON_GOING) {
				return { Error: 1 };
			}
			await battle.upSynchronizeWithDB(); // Ensure this is awaited

			const loserQuery = {
				id: loser_id.toString(),
				_guild_id: guild_id.toString(),
			};

			const winnerQuery = {
				id: winner_id.toString(),
				_guild_id: guild_id.toString(),
			};

			// Update user data for winner and loser
			const winnerUpdateQuery = [
				{
					$set: {
						wins: { $ifNull: ["$wins", 0] },
						losses: { $ifNull: ["$losses", 0] },
					},
				},
				{
					$set: {
						wins: { $add: ["$wins", 1] },
					},
				},
			];

			const loserUpdateQuery = [
				{
					$set: {
						wins: { $ifNull: ["$wins", 0] },
						losses: { $ifNull: ["$losses", 0] },
					},
				},
				{
					$set: {
						losses: { $add: ["$losses", 1] },
					},
				},
			];

			// Perform the updates with aggregation pipeline
			try {
				const loser = await userQuery.updateOne(
					loserQuery,
					loserUpdateQuery,
					{ upsert: true },
					true
				);
				const winner = await userQuery.updateOne(
					winnerQuery,
					winnerUpdateQuery,
					{ upsert: true },
					true
				);

				return { loser, winner, battle };
			} catch (error) {
				console.error("Error updating battle status:", error);
			}
		} catch (error) {
			console.error("Error updating user statistics:", error);
		}
	}

	getBattleChannel() {
		return this.channel_id;
	}

	async grabAllProperties(noId = false) {
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

				if (key.startsWith("_")) continue;

				data[key] = this[key];
			}
		}
		return data;
	}

	async downSynchronizeWithDB() {
		const query = new Query("pvpBattles");
		let data = await query.readOne({ _id: this._id });
		if (Object.keys(data).length <= 0) {
			data = await query.insertOne(await this.grabAllProperties());
			this._id = new ObjectId(data._id);
		}
		return data;
	}
	async upSynchronizeWithDB(ignore = {}) {
		const query = new Query("pvpBattles");
		const grabAllProperties = await this.grabAllProperties(this);
		if (Object.keys(ignore).length > 0) {
			for (const keys in ignore) {
				grabAllProperties[keys] = ignore[keys];
			}
		}
		await query.updateOne({ _id: this._id }, await grabAllProperties);
	}
	stopBattle(reason) {
		for (const Status in BattleStatus) {
			if (reason === BattleStatus[Status]) {
				this.updateStatus(BattleStatus[Status]);
				this._end = true;
			}
		}

		if (this._end) {
			this._localOnly.clear();
			this.finished_at = new Date();

			this.upSynchronizeWithDB();
		} else {
			console.log("Battle has ended with an invalid reason!");
		}
	}

	async createPVPMessages(channel, cards = [], user = null) {
		channel.send("place holder text (:");
	}

	async startBattle(guild, challenger, challenged) {
		/* 
		
		WHEN AM I ACTUALLY GOING TO FINISH THE BATTLE SEQUENCE AND HAVE A FUNCTIONING BATTLE?
		TUNE IN NEXT TIME OF I'M SO LAZY!
		
		*/
		this._realtime_updates = true;
		this.updateStatus(BattleStatus.ON_GOING);
		return;
		const challengedUser = client.users.fetch(this.challenged_id);
		const challengerUser = client.users.fetch(this.challenger_id);

		const challengerChannel = client.channels.fetch(this.channelId);
		const challengedChannel = challengedUser;

		// Initialize pvp Message
		createPVPMessages(challengerChannel);
		createPVPMessages(challengedChannel);
	}

	async turn(fieldMessage, statusMessage, cardOnField, cardsOffField) {
		const battleChannel = fieldMessage.channel;

		const user = fieldMessage.user;
	}

	getWinner() {
		return this.winner_id;
	}
}

module.exports = { Battle, BattleStatus, moveTypes };
