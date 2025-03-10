const pvpCards = {
	collectionName: "pvpCards",
	schema: {
		bsonType: "object",
		required: ["main_id", "player_id"],
		properties: {
			_id: {
				bsonType: "objectId",
				description: "Unique identifier for the challenge",
			},
			player_id: {
				bsonType: "string",
				description: "id of the user",
			},
			main_id: {
				bsonType: "objectId",
				description: "id of the game",
			},
			cards: {
				bsonType: "array",
				description:
					"Cards selected for the battle, stored during the challenge phase.",
				items: {
					bsonType: "objectId",
					description: "id of the cards",
				},
			},
		},
	},
};

module.exports = pvpCards;
