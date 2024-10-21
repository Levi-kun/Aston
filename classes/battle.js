const {
	Collection,
	Guild,
	ActionRowBuilder,
	ButtonBuilder,
	ButtonStyle,
	EmbedBuilder,
} = require("discord.js");
const { ObjectId } = require("mongodb");
const { Query } = require("../databases/query.js"); // Adjust the path accordingly
const bot = require("../client.js");
const eventEmitter = require("../src/eventManager");
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
						await pvpBattlesQuery.updateOne(
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
	lockProperty(prop) {
		this._localOnly.add(prop);
	}

	// Unlock a property so it can trigger database updates
	unlockProperty(prop) {
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
			// Check if battle already exists
			const existingBattle = await pvpBattlesQuery.findOne({
				$or: [
					{ challenged_id: challenger_id },
					{ challenger_id: challenger_id },
				],
				guild_id: guild_id,
			});

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

			const result = await pvpBattlesQuery.insertOne(newBattleData);
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

	async giveChoicetoUser(channel) {

		const row = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId(`choose_first_${this.battleId}_1`) // 1 for first
				.setLabel(`Go First`)
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId(`choose_first_${this.battleId}_2`) // 2 for second
				.setLabel(`Go Second`)
				.setStyle(ButtonStyle.Primary)
		);

		 const embed = new EmbedBuilder()
				.setTitle("Choose Turn Order")
				.setDescription(
					`${player.user.username}, would you like to go **first** or **second**?`
				)
				.setColor("#3498DB");

		await channel.send({ embeds: [embed], components: [row] });
	}

	async startBattle() {
		this.status = BattleStatus.ON_GOING;
		this.lockProperty("status");

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
