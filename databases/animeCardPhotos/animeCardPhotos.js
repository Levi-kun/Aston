const animepicturesListSchema = {
    collectionName: "animeCardPhotos",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: ["card_id", "attachment", "pictureLink", "_id"],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the pictures",
            },
            card_id: {
                bsonType: "objectId",
                description: "unique identifier for the parent card",
            },
            attachment: {
                bsonType: "string",
                description: "link to attachment",
            },
            pictureLink: {
                bsonType: "string",
                description: "where is this from?",
            },
        },
    },
};

module.exports = animepicturesListSchema;
