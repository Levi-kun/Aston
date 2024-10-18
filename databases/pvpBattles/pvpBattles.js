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
			challenger_cards: {
				bsonType: "array",
				items: {
					bsonType: "object",
					required: ["card_id", "name", "power", "health"],
					properties: {
						_id: { bsonType: "objectId" },
						card_id: { bsonType: "objectId" },
						name: { bsonType: "string" },
						power: { bsonType: "int" }, // Real-time power during battle
						health: { bsonType: "int" }, // Real-time health during battle
						rank: { bsonType: "string" },
						version: { bsonType: "string" },
						move_sets: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									move_name: { bsonType: "string" },
									move_power: { bsonType: "int" },
								},
							},
						},
						buffs: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									sourceCard: { bsonType: "string" }, // Card applying the buff
									targetAttribute: { bsonType: "string" }, // Attribute affected
									value: { bsonType: "int" }, // Amount of buff
									duration: { bsonType: "int" }, // Turns the buff lasts
									appliedAt: { bsonType: "date" }, // Timestamp of application
								},
							},
						},
						debuffs: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									sourceCard: { bsonType: "string" },
									targetAttribute: { bsonType: "string" },
									value: { bsonType: "int" },
									duration: { bsonType: "int" },
									appliedAt: { bsonType: "date" },
								},
							},
						},
					},
				},
			},
			challenged_cards: {
				bsonType: "array",
				items: {
					bsonType: "object",
					required: ["card_id", "name", "power", "health"],
					properties: {
						_id: { bsonType: "objectId" },
						card_id: { bsonType: "objectId" },
						name: { bsonType: "string" },
						power: { bsonType: "int" },
						health: { bsonType: "int" },
						rank: { bsonType: "string" },
						version: { bsonType: "string" },
						move_sets: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									move_name: { bsonType: "string" },
									move_power: { bsonType: "int" },
								},
							},
						},
						buffs: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									sourceCard: { bsonType: "string" },
									targetAttribute: { bsonType: "string" },
									value: { bsonType: "int" },
									duration: { bsonType: "int" },
									appliedAt: { bsonType: "date" },
								},
							},
						},
						debuffs: {
							bsonType: "array",
							items: {
								bsonType: "object",
								properties: {
									sourceCard: { bsonType: "string" },
									targetAttribute: { bsonType: "string" },
									value: { bsonType: "int" },
									duration: { bsonType: "int" },
									appliedAt: { bsonType: "date" },
								},
							},
						},
					},
				},
			},
			challenger_powers: {
				bsonType: "array",
				items: { bsonType: "string" },
			},
			challenged_powers: {
				bsonType: "array",
				items: { bsonType: "string" },
			},
			current_turn: { bsonType: "string" },
			status: { bsonType: "string" },
			created_at: { bsonType: "date" },
			winner_id: { bsonType: "string" },
			loser_id: { bsonType: "string" },
			turnCount: { bsonType: "int" },
			finished_at: { bsonType: "date" },
		},
	},
};

module.exports = pvpBattlesSchema;
