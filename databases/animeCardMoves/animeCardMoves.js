const animemovesListSchema = {
    collectionName: "animeCardMoves",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: [
            "name",
            "card_id",
            "description",
            "version",
            "dmg",
            "specialdmg",
            "ownModifier",
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
            card_id: {
                // refrence id from animeCardList
                bsonType: "int",
                minimum: 1000,
                maximum: 20000,
                description: "Power of the moves",
            },
            description: {
                bsonType: "string",
                description: "moves(ies) of the moves.",
            },
            version: {
                bsonType: "int",
                description: "Version of the moves",
            },
            dmg: {
                bsonType: "int",
                description: "Damage value of the moves",
            },
            specialdmg: {
                bsonType: "int",
                description: "ult special dmg",
            },
            ownModifier: {
                bsonType: "int",
                description: "modifies dmg",
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
