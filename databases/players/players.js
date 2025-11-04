export const player = {
        collectionName: "Players",
        schema: {
                bsonType: "object",
                required: ["userId", "guildId"],
                properties: {
                        _id: {
                                bsonType: "objectId",
                                description: "Unique identifier for the player document",
                        },
                        userId: {
                                bsonType: "string",
                                description: "Discord user ID",
                        },
                        guildId: {
                                bsonType: "objectId",
                                description: "Reference to the guild the player belongs to",
                        },
                },
        },
};
