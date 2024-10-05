const animeCardListSchema = {
    collectionName: "animeCardList",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: ["name", "power", "categories", "owned", "rarity", "version"], // Required fields
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the card",
            },
            name: {
                bsonType: "string",
                minLength: 2,
                maxLength: 32,
                description: "Name of the card",
            },
            power: {
                bsonType: "int",
                minimum: 1000,
                maximum: 20000,
                description: "Power of the card",
            },
            categories: {
                bsonType: "array",
                minItems: 1,
                maxItems: 3,
                items: {
                    bsonType: "string",
                    minLength: 2,
                    maxLength: 32,
                },
                description: "Category(ies) of the card.",
            },
            owned: {
                bsonType: "int",
                description: "how many owned this?",
            },
            rarity: {
                bsonType: "int",
                description: "rarity type",
            },
            version: {
                bsonType: "int",
                description: "version of the card",
            },
        },
    },
};

module.exports = animeCardListSchema;
