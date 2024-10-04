const guildDataBasetSchema = {
    collectionName: "guildDataBase",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: ["name", "amountofUsers", "gainADAY", "searchADAY"],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the guild",
            },
            name: {
                bsonType: "string",
                minLength: 2,
                maxLength: 32,
                description: "Name of the guild",
            },
            id: {
                // guild id
                bsonType: "int",
            },
            amoungOfUsers: {
                bsonType: "int",
                description: "amount of people in this guild",
            },
            version: {
                bsonType: "int",
                description: "Version of the document, if needed",
            },
            gainADAY: {
                bsonType: "int",
                description: "amount allowed a day for a single user",
            },
            searchADAY: {
                bsonType: "int",
                description: "amount of cards that randomly spawn",
            },
            channelInformation: {
                bsonType: "array",
                description: "special channel ids",
                items: {
                    bsonType: "object",
                    required: ["_id", "_type"],
                    _id: {
                        bsonType: "string",
                        description: "id of channel",
                    },
                    _type: {
                        enum: [
                            "default",
                            "spawnChannel",
                            "serverChannel",
                            "auditLogChannel",
                            "repostHereChannel",
                            "battleLogsHere",
                        ],
                        description: "type of channel this is",
                    },
                },
            },

            pro: {
                bsonType: "bool",
                description: "for future use.",
            },
        },
    },
};

module.exports = { guildDataBasetSchema };
