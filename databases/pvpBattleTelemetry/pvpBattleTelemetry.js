const pvpBattleTelemetrySchema = {
	collectionName: "pvpBattleTelemetry",
	schema: {
		bsonType: "object",
		required: ["battle_id"],
		properties: {
			_id: { bsonType: "objectId" },
			battle_id: { bsonType: "objectId" }, // Links to pvpBattles _id
			player_id: { bsonType: "string" },
			totalTurns: { bsonType: "int" }, // Total number of turns in the battle
			totalDamageDealt: { bsonType: "int" }, // Cumulative damage across the battle
			totalHealingDone: { bsonType: "int" }, // Cumulative healing across the battle
			totalCardSwitches: { bsonType: "int" }, // Total card switches by both players
			totalFocusCompleted: { bsonType: "int" }, // Number of successfully completed FOCUS moves
			totalSpecialTriggered: { bsonType: "int" }, // Number of SPECIAL moves triggered
			averageTurnDuration: { bsonType: "int" }, // Average time per turn (in ms)
			moveFrequency: {
				bsonType: "array",
				items: {
					bsonType: "object",
					properties: {
						move_id: { bsonType: "objectId" },
						usageCount: { bsonType: "int" },
					},
				},
			},
		},
	},
};

module.exports = pvpBattleTelemetrySchema;
