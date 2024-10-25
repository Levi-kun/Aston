const guildDataBaseSchema = {
	collectionName: "guildDataBase",
	schema: {
		bsonType: "object",
		required: [
			"name",
			"_id",
			"amountofUsers",
			"gainADAY",
			"searchADAY",
			"version",
		],
		additionalProperties: false,
		properties: {
			name: {
				bsonType: "string",
				minLength: 2,
				maxLength: 32,
				description: "Name of the guild",
			},
			_id: {
				bsonType: "objectId",
				description: "Unique identifier for the guild",
			},
			id: {
				bsonType: "string",
				description: "Guild ID",
			},
			amountofUsers: {
				bsonType: "int",
				description: "Amount of people in this guild",
			},
			version: {
				bsonType: "int",
				description: "Version of the document, if needed",
			},
			gainADAY: {
				bsonType: "int",
				description: "Amount allowed a day for a single user",
			},
			searchADAY: {
				bsonType: "int",
				description: "Amount of cards that randomly spawn",
			},
			channelInformation: {
				bsonType: "object",
				description: "Special channel IDs",
				properties: {
					name: {
						bsonType: "object",
						description: "nested Objects let's go!!",
						required: ["_id", "_type"],
						properties: {
							_id: {
								bsonType: "string",
								description: "ID of the channel",
							},
							_type: {
								bsonType: "string", // Use string as bsonType
								enum: [
									"default",
									"spawnChannel",
									"serverChannel",
									"auditLogChannel",
									"repostHereChannel",
									"battleLogsHere",
								], // Enum to restrict values
								description: "Type of channel this is",
							},
						},
					},
				},
			},
			pro: {
				bsonType: "bool",
				description: "For future use.",
			},
		},
	},
};

module.exports = guildDataBaseSchema;
