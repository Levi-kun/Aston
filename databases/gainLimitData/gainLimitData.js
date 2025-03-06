const gainLimitData = {
	collectionName: "gainLimitData",
	schema: {
		bsonType: "object",
		required: ["user_id", "date", "guild_id"],
		properties: {
			_id: { bsonType: "objectId" },
			guild_id: { bsonType: "string" },
			date: { bsonType: "date" },
			user_id: { bsonType: "string" }, // Changed to string
		},
	},
};

module.exports = gainLimitData;
