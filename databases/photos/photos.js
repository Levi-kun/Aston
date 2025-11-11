export const photo = {
        collectionName: "photos",
        schema: {
                bsonType: "object",
                properties: {
                        _id: { bsonType: "objectId" },
                        name: {
                                bsonType: "string",
                                description: "name of photo",
                        },
                        path: {
                                bsonType: "string",
                                description: "Path to the image file",
                        },
                        createdAt: {
                                bsonType: "date",
                        },
                        updatedAt: {
                                bsonType: "date",
                        },
                },
        },
};
