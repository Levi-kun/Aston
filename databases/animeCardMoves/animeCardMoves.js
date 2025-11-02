const animemovesListSchema = {
        collectionName: "animeCardMoves",
        schema: {
                bsonType: "object",
                required: [
                        "name",
                        "_id",
                        "description",
                        "version",
                        "modifiers",
                        "parent",
                        "duration",
                        "cooldown",
                        "turnCost",
                ],
                additionalProperties: false,
                properties: {
                        _id: {
                                bsonType: "objectId",
                                description: "Unique identifier for the moves",
                        },
                        name: {
                                bsonType: "string",
                                minLength: 2,
                                maxLength: 32,
                                description: "Name of the move",
                        },
                        parent: {
                                bsonType: "object",
                                description:
                                        "Category this move belongs to (either card or category)",
                                properties: {
                                        id: {
                                                bsonType: "string",
                                                description: "ID of the parent card or category",
                                        },
                                        isCard: {
                                                bsonType: "bool",
                                                description:
                                                        "True if this is a card-specific ultimate move",
                                        },
                                },
                        },
                        description: {
                                bsonType: "string",
                                description: "Description of the move",
                        },
                        version: {
                                bsonType: "int",
                                description: "Version of the move",
                        },
                        duration: {
                                bsonType: "int",
                                description: "Duration of the move effect in turns",
                        },
                        cooldown: {
                                bsonType: "int",
                                description: "Turns required to wait before reusing the move",
                        },
                        turnCost: {
                                bsonType: "int",
                                minimum: 1,
                                maximum: 5,
                                description:
                                        "Move power cost (1-5) required to use this move in a turn",
                        },
                        modifiers: {
                                bsonType: "array",
                                items: {
                                        bsonType: "object",
                                        properties: {
                                                type: {
                                                        bsonType: "string",
                                                        description:
                                                                "Type of modifier (e.g., buff, debuff)",
                                                },
                                                target: {
                                                        bsonType: "string",
                                                        description:
                                                                "The attribute (e.g., health, power) that move affects",
                                                },
                                                flat: {
                                                        bsonType: "int",
                                                        description:
                                                                "The value of the modifier as a flat value",
                                                },
                                                percentage: {
                                                        bsonType: "int",
                                                        description:
                                                                "The value of the modifier as a percentage",
                                                },
                                        },
                                },
                                description: "Modifies other cards or stats during battle",
                        },
                        requirementForm: {
                                bsonType: "object",
                                description:
                                        "If ability changes by a condition, new ability is nested here",
                                properties: {
                                        name: {
                                                bsonType: "string",
                                        },
                                        requirement: {
                                                bsonType: "object",
                                                description:
                                                        "Requirement to trigger the alternate form",
                                                properties: {
                                                        type: { bsonType: "string" },
                                                        value: { bsonType: "int" },
                                                },
                                        },
                                        data: {
                                                bsonType: "object",
                                                properties: {
                                                        name: {
                                                                bsonType: "string",
                                                                minLength: 2,
                                                                maxLength: 32,
                                                                description: "Name of the alternate move",
                                                        },
                                                        undo: {
                                                                bsonType: "object",
                                                                properties: {
                                                                        type: { bsonType: "string" },
                                                                        value: { bsonType: "int" },
                                                                },
                                                        },
                                                        modifiers: {
                                                                bsonType: "array",
                                                                items: {
                                                                        bsonType: "object",
                                                                        properties: {
                                                                                type: {
                                                                                        bsonType: "string",
                                                                                        description:
                                                                                                "Type of modifier (e.g., buff, debuff)",
                                                                                },
                                                                                target: {
                                                                                        bsonType: "string",
                                                                                        description:
                                                                                                "The attribute affected",
                                                                                },
                                                                                flat: { bsonType: "int" },
                                                                                percentage: { bsonType: "int" },
                                                                        },
                                                                },
                                                                description: "Modifiers for the alternate move",
                                                        },
                                                },
                                        },
                                },
                        },
                },
        },
};

module.exports = animemovesListSchema;
