export const SpawnedCard = {
        collectionName: "SpawnedCard",
        schema: {
                bsonType: "object",
                required: ["refVariantCard", "moveSet"],
                properties: {
                        _id: { bsonType: "objectId" },
                        refVariantCard: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the VariantCard document this spawned instance is derived from.",
                        },
                        moveSet: {
                                bsonType: "array",
                                items: { bsonType: "objectId" },
                                description:
                                        "Array of references to Move documents defining the card's abilities or actions.",
                        },
                },
        },
};
