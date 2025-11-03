export const player = {
        collectionName: "Players",
        schema: {
                _id: { bsonType: "objectId" },
                userId: { bsonType: "string", description: "Discord user Id" },
                guildId: { bsonType: "objectId" },
        },
};
