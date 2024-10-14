const animemovesListSchema = {
    collectionName: "animeCardMoves",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: [
            "name",
            "_id",
            "description",
            "version",
            "value",
            "specialdmg",
            "ownModifier",
            "parent",
            "duration",
            "otherModifier",
        ],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the moves",
            },
            name: {
                bsonType: "string",
                minLength: 2,
                maxLength: 32,
                description: "Name of the moves",
            },
            parent: {
                // refrence id from animeCardList
                bsonType: "object",
                description: "category this move belongs to",
                properties: {
                    id: {
                        bsonType: "string",
                        description: "name of category or name of card",
                    },
                    isCard: {
                        bsonType: "bool",
                        description: "is a card ultimate if so true",
                    },
                },
            },
            description: {
                bsonType: "string",
                description: "description of the move.",
            },
            version: {
                bsonType: "int",
                description: "Version of the moves",
            },
            value: {
                bsonType: "int",
                description: "Power value of the move",
            },
            specialdmg: {
                bsonType: "int",
                description: "ult special dmg flat add",
            },
            ownModifier: {
                bsonType: "int",
                description: "modifies dmg",
            },
            duration: {
                bsonType: "int",
                description: "duration in units of turn.",
            },
            otherModifier: {
                bsonType: "array",
                minItems: 0,
                maxItems: 2,
                description: "modifies other aspects",
            },
        },
    },
};

module.exports = animemovesListSchema;
