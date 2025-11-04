export const interactionEvents = {
        collectionName: "interactionEvents",
        schema: {
                bsonType: "object",
                required: ["_id", "commandName", "user_id"],
                additionalProperties: true,
                properties: {
                        _id: {
                                bsonType: "objectId",
                                description:
                                        "unique identifier for the settings, dk just wanna store something here",
                        },
                        interactionType: {
                                bsonType: "string",
                        },
                        commandName: {
                                bsonType: "string",
                        },
                        created_at: {
                                bsonType: "date",
                        },
                        user_id: {
                                bsonType: "object",
                                properties: {
                                        id: {
                                                bsonType: "string",
                                        },
                                        name: {
                                                bsonType: "string",
                                        },
                                },
                        },
                        reaction_time: {
                                bsonType: "string",
                        },
                        error: {
                                bsonType: "string",
                        },
                },
        },
};
