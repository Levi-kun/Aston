const defaultSchema = {
	collectionName: "defaultCardChoice",
	schema: {
		bsonType: "object", // Specifies that the root type is an object
		required: ["user_id", "guild_id", "cardArray", "loadoutType"],
		additionalProperties: false, // Disallow any fields that are not explicitly defined}
		properties: {
			_id: {
				bsonType: "objectId",
				description: "Unique identifier for the pictures",
			},
			user_id: {
				bsonType: "string",
				description: "unique identifier for the user",
			},
			guild_id: {
				bsonType: "string",
				description: "guild identifier",
			},
			cardArray: {
				bsonType: "array",
				description: "Array of card objects",
				items: {
					bsonType: "objectId",
					description: "unique identifier for the card",
				},
			},
			loadoutName: {
				bsonType: "string",
				description: "Type of loadout (e.g., 'default', 'robot')",
			},
		},
	},
};

module.exports = defaultSchema;
