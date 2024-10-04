const pvpChallengesSchema = {
    collectionName: "pvpChallenges",
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
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the challenge",
            },
            guild_id: {
                bsonType: "string",
                description: "ID of the guild where the challenge is happening",
            },
            challenger_id: {
                bsonType: "string",
                description: "ID of the challenger user",
            },
            challenged_id: {
                bsonType: "string",
                description: "ID of the user being challenged",
            },
            status: {
                bsonType: "string",
                description:
                    "Status of the challenge (e.g., pending, accepted, rejected)",
            },
            created_at: {
                bsonType: "date",
                description: "The date and time when the challenge was created",
            },
        },
    },
};

module.exports = pvpChallengesSchema;
