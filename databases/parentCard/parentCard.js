export const ParentCard = {
        collectionName: "ParentCard",
        schema: {
                bsonType: "object",
                required: ["type", "baseRarity", "name", "base_stats"],
                properties: {
                        _id: { bsonType: "objectId" },

                        type: {
                                bsonType: "array",
                                items: { bsonType: "string" },
                                description: "Array of string tags that classify the item.",
                        },

                        baseRarity: {
                                bsonType: "number",
                                minimum: 1,
                                maximum: 5,
                                description: "Base rarity tier (1–5).",
                        },

                        name: {
                                bsonType: "string",
                                description: "Name of the card or entity.",
                        },

                        description: {
                                bsonType: "string",
                                description: "Detailed description of the card.",
                        },

                        photoRef: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the Photos collection document containing this card's image.",
                        },

                        baseStats: {
                                bsonType: "object",
                                required: [
                                        "health",
                                        "defense",
                                        "attack",
                                        "critRate",
                                        "critDamage",
                                        "pierce",
                                ],
                                properties: {
                                        health: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description: "Base HP value.",
                                        },
                                        defense: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description: "Base defense stat.",
                                        },
                                        attack: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description: "Base attack power.",
                                        },
                                        critRate: {
                                                bsonType: "number",
                                                minimum: 0,
                                                maximum: 1,
                                                description:
                                                        "Base critical hit chance (0–1, representing 0%–100%).",
                                        },
                                        critDamage: {
                                                bsonType: "number",
                                                minimum: 1,
                                                description:
                                                        "Critical damage multiplier (e.g., 1.5 = +50% damage).",
                                        },
                                        pierce: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description:
                                                        "Base armor-piercing stat or defense-ignore percentage.",
                                        },
                                },
                                description:
                                        "The foundational stat block that defines this card's starting combat values.",
                        },
                },
        },
};
