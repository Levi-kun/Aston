export const photo = {
        collectionName: "photos",
        schema: {
                bsonType: "object",
                properties: {
                        _id: { bsonType: "objectId" },
                        refVariantCard: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the VariantCard document this spawned instance is derived from.",
                        },
                        path: {
                                bsonType: "objectId",
                                description: "Path to the image file",
                        },
                        createdAt: {
                                bsonType: "Date",
                                default: Date.now,
                        },
                        updatedAt: {
                                bsonType: "Date",
                                default: Date.now,
                        },
                },
        },
};
