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
		this.initTelemetry(player_id);
		this.initCards(player_id);
	}
	/* 
	
	End of Initialize Functions
	
	*/

	async startBattle(client) {
		// Fetch users and channels
		const challengerUser = await client.users.fetch(this.challenger);
		const challengedUser = await client.users.fetch(this.challenged);
		const guild = await client.guilds.fetch(this.guild_id);
		const channel = await guild.channels.fetch(this.channel_id);

		if (!channel || !challengerUser || !challengedUser || !guild) {
			throw new Error(
				"Invalid Channel, User, or Guild. Please check the IDs."
			);
		}

		const enemyCard = pvpCards.readMany({
			player_id: this.challenged,
			main_id: this._id,
		});

		const enemyMoves = [
			/* ...move1, move2, move3... */
		];
		const enemyRemainingCards = 3; // Example

		// BOARD MESSAGE EMBED
		const boardEmbed = new EmbedBuilder()
			.setTitle("Enemy Board")
			.setDescription(
				`**Enemy Card:** ${enemyCard.name}\n` +
					`**Moves:** ${enemyMoves.map((m) => m.name).join(", ")}\n` +
					`**Enemy Remaining Cards:** ${enemyRemainingCards}`
			);

		// GAME MESSAGE EMBED + BUTTONS
		const gameEmbed = new EmbedBuilder()
			.setTitle("Game Update")
			.setDescription(" ");

		const buttonRow = new ActionRowBuilder().addComponents(
			new ButtonBuilder()
				.setCustomId("inspect")
				.setLabel("INSPECT")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("switch")
				.setLabel("SWITCH")
				.setStyle(ButtonStyle.Primary),
			new ButtonBuilder()
				.setCustomId("move1")
				.setLabel("MOVE1")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId("move2")
				.setLabel("MOVE2")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId("move3")
				.setLabel("MOVE3")
				.setStyle(ButtonStyle.Success),
			new ButtonBuilder()
				.setCustomId("forfeit")
				.setLabel("FORFEIT")
				.setStyle(ButtonStyle.Danger)
		);

		// Send to server channel
		await channel.send({ embeds: [boardEmbed] });
		const gameMsg = await channel.send({
			embeds: [gameEmbed],
			components: [buttonRow],
		});

		// Send to challenger DM
		await challengerUser.send({ embeds: [boardEmbed] });
		const challengerGameMsg = await challengerUser.send({
			embeds: [gameEmbed],
			components: [buttonRow],
		});

		// Send to challenged DM
		await challengedUser.send({ embeds: [boardEmbed] });
		const challengedGameMsg = await challengedUser.send({
			embeds: [gameEmbed],
			components: [buttonRow],
		});

		// Button interaction collector (example for channel, repeat for DMs as needed)
		const filter = (i) =>
			[this.challenger, this.challenged].includes(i.user.id);
		const collector = gameMsg.createMessageComponentCollector({
			componentType: ComponentType.Button,
			filter,
			time: 60000,
		});

		collector.on("collect", async (i) => {
			let description = "";
			switch (i.customId) {
				case "inspect":
					description = "Shows details about the current card.";
					break;
				case "switch":
					description = "Switch to another card.";
					break;
				case "move1":
					description = "Use Move 1.";
					break;
				case "move2":
					description = "Use Move 2.";
					break;
				case "move3":
					description = "Use Move 3.";
					break;
				case "forfeit":
					description = "Forfeit the battle.";
					break;
			}
			// Ephemeral message (only visible to the user)
			await i.reply({ content: description, ephemeral: true });
			// Handle game logic here...
		});
	}
}

(module.exports = Battle), BattleStatus;
