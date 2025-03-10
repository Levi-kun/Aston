const pvpBattlesSchema = {
	collectionName: "pvpBattles",
	schema: {
		bsonType: "object",
		required: [
			"guild_id",
			"challenger_id",
			"challenged_id",
			"status",
			"created_at",
		],
		properties: {
			_id: { bsonType: "objectId" },
			guild_id: { bsonType: "string" },
			challenger_id: { bsonType: "string" },
			challenged_id: { bsonType: "string" },
			active_card: {
				bsonType: "object",
				description: "Tracks the current active card for each player.",
				properties: {
					card_id: { bsonType: "objectId" },
					health: { bsonType: "int" },
				},
			},
			soul_card: {
				bsonType: "object",
				description: "The special soul card for each player.",
				required: ["card_id", "health"],
				properties: {
					card_id: { bsonType: "objectId" },
					health: { bsonType: "int" },
				},
			},
			channel_id: {
				bsonType: "string",
				description: "Channel ID where the battle started.",
			},
			current_turn: {
				bsonType: "string",
				description: "The user ID of the player whose turn it is.",
			},
			status: {
				bsonType: "string",
				enum: ["pending", "ongoing", "finished"],
				description: "Current status of the battle.",
			},
			created_at: {
				bsonType: "date",
				description: "Timestamp when the battle was initiated.",
			},
			winner_id: {
				bsonType: "string",
				description: "ID of the player who won the battle.",
			},
			loser_id: {
				bsonType: "string",
				description: "ID of the player who lost the battle.",
			},
			turnCount: {
				bsonType: "int",
				description: "Number of turns taken in the battle.",
			},
			finished_at: {
				bsonType: "date",
				description: "Timestamp when the battle concluded.",
			},
		},
	},
};

module.exports = pvpBattlesSchema;
