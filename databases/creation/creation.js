export const CreationEvent = {
        collectionName: "creationEvent",
        schema: {
                bsonType: "object",
                required: ["channel_id", "guild_id", "timestamp", "spawnedCard_id"],
                properties: {
                        _id: { bsonType: "objectId" },

                        channel_id: {
                                bsonType: "string",
                                description:
                                        "The ID of the Discord channel where this card was created.",
                        },

                        guild_id: {
                                bsonType: "string",
                                description:
                                        "The ID of the Discord guild/server where this card was created.",
                        },

                        timestamp: {
                                bsonType: "date",
                                description: "When the card creation event occurred.",
                        },

                        spawnedCard_id: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the SpawnedCard document created in this event.",
                        },
                },
        },
        options: {
                description:
                        "Records when and where a card was spawned, pointing to the original SpawnedCard.",
        },
};
