export const ParentCard = {
        collectionName: "ParentCard",
        schema: {
                bsonType: "object",
                required: ["type", "baseRarity", "name"],
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
                                description: "Rarity percentage between 0 and 100.",
                        },
                        name: {
                                bsonType: "string",
                                description: "Name of the item.",
                        },
                        description: {
                                bsonType: "string",
                                description: "Detailed description of the item.",
                        },
                        photoRef: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the document in the Photos collection containing the item's image.",
                        },
                },
        },
};
