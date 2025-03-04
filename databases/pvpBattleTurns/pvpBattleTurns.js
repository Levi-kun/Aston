const pvpBattleTurnsSchema = {
	collectionName: "pvpBattleTurns",
	schema: {
		bsonType: "object",
		required: ["battle_id", "turn_number"],
		properties: {
			_id: { bsonType: "objectId" },
			battle_id: { bsonType: "objectId" }, // Links to pvpBattles _id
			turn_number: { bsonType: "int" },
			moveUsage: {
				bsonType: "array",
				items: {
					bsonType: "object",
					properties: {
						move_id: { bsonType: "objectId" },
						count: { bsonType: "int" },
					},
				},
			},
			damageDealt: { bsonType: "int" },
			healingDone: { bsonType: "int" },
			cardSwitches: { bsonType: "int" },
			turnDuration: { bsonType: "int" }, // Time in ms
			focusCompleted: { bsonType: "int" },
			specialTriggered: { bsonType: "int" },
		},
	},
};

module.exports = pvpBattleTurnsSchema;
