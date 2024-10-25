const userDataBase = {
	collectionName: "userDataBase",
	schema: {
		bsonType: "object", // Specifies that the root type is an object
		required: ["_id", "_guild_id", "name"], // Required fields
		additionalProperties: false, // Disallow any fields that are not explicitly defined}
		properties: {
			_id: {
				bsonType: "objectId",
				description: "uniqueId",
			},
			id: {
				bsonType: "string",
				description: "Unique identifier for the user",
			},
			_guild_id: {
				bsonType: "string",
				description: "guild id this user belongs to",
			},
			name: {
				bsonType: "string",
				description: "User name of the user",
			},
			past_names: {
				bsonType: "array",
				items: {
					bsonType: "string",
				},
			},
			current_claims: {
				bsonType: "int",
				description: "current claims he can do",
			},
			wins: {
				bsonType: "int",
				description: "How many times the won",
			},
			loses: {
				bsonType: "int",
				description: "List of loses with associated game IDs",
			},
			location: {
				bsonType: "string",
				description: "location of the user ??? ",
			},
			weatherunit: {
				bsonType: "string",
				description: "weather unit for user",
			},
			last_seen: {
				bsonType: "timestamp",
			},
			deprecated: {
				bsonType: "bool",
			},
			userProfile: {
				bsonType: "object", // The root type is an object
				required: [
					"discordId",
					"username",
					"discriminator",
					"joinedAt",
					"roles",
				],
				additionalProperties: false,
				properties: {
					_id: {
						bsonType: "objectId",
						description:
							"Unique identifier for the profile in the database",
					},
					discordId: {
						bsonType: "string",
						description:
							"Unique Discord ID of the user (snowflake ID)",
					},
					username: {
						bsonType: "string",
						description: "The user's Discord username",
					},
					discriminator: {
						bsonType: "string",
						description:
							"The user's discriminator (the four digits after the username, e.g., #1234)",
					},
					avatar: {
						bsonType: "string",
						description: "URL or hash of the user's avatar image",
					},
					bio: {
						bsonType: "string",
						description:
							"Short biography or description provided by the user",
					},
					status: {
						bsonType: "string",
						enum: ["online", "offline", "idle", "dnd"],
						description: "Current status of the user",
					},
					roles: {
						bsonType: "array",
						description: "Array of role IDs the user has",
						items: {
							bsonType: "string",
						},
					},
					activity: {
						bsonType: "object",
						description:
							"The current activity of the user, such as playing a game",
						properties: {
							type: {
								bsonType: "string",
								enum: [
									"playing",
									"streaming",
									"listening",
									"watching",
								],
								description: "Type of the activity",
							},
							name: {
								bsonType: "string",
								description: "The name of the activity",
							},
							startTime: {
								bsonType: "date",
								description: "When the activity started",
							},
						},
					},
					joinedAt: {
						bsonType: "date",
						description: "When the user joined the Discord server",
					},
					lastMessageAt: {
						bsonType: "date",
						description:
							"Timestamp of the user's last message in the server",
					},
					stats: {
						bsonType: "object",
						description: "User's statistics",
						properties: {
							messagesSent: {
								bsonType: "int",
								description:
									"Total number of messages sent by the user",
							},
							gamesPlayed: {
								bsonType: "int",
								description:
									"Number of games the user has played",
							},
						},
					},
				},
			},
			metaData: {
				bsonType: "object",
				additionalProperties: true,
				description: "additional information on user",
			},
			pro: {
				bsonType: "bool",
				description: "future use",
			},
		},
	},
};

module.exports = userDataBase;
