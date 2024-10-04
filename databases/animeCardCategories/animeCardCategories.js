const animecategoryListSchema = {
    collectionName: "animecategoryCategory",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: [
            "name",
            "categories",
            "owned",
            "rarity",
            "version",
            "dmg",
            "critChance",
            "critDamage",
            "weakness",
            "strength",
        ],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the category",
            },
            name: {
                bsonType: "string",
                minLength: 2,
                maxLength: 32,
                description: "Name of the category",
            },
            resistance: {
                bsonType: "array",
                minItems: 1,
                maxItems: 2,
                items: {
                    bsonType: "int",
                },
                description: "Category(ies) of the category.",
            },
            version: {
                bsonType: "int",
                description: "Version of the category",
            },
            dmg: {
                bsonType: "int",
                description: "Damage value of the category",
            },
            critChance: {
                bsonType: "int",
                description: "Critical chance value of the category",
            },
            critDamage: {
                bsonType: "int",
                description: "Critical damage value of the category",
            },
            weakness: {
                bsonType: "int",
                description: "Weakness value of the category",
            },
            strength: {
                bsonType: "int",
                description: "Strength value of the category",
            },
        },
    },
};

module.exports = { animecategoryListSchema };
