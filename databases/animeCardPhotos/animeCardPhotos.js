const animepicturesListSchema = {
    collectionName: "animeCardPhotos",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: ["name", "cardId", "attachment", "pictureLink"],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the pictures",
            },
            name: {
                bsonType: "string",
                minLength: 2,
                maxLength: 32,
                description: "Name of the pictures",
            },
            card_id: {
                // refrence id from animeCardList
                bsonType: "int",
            },
            description: {
                bsonType: "string",
                description: "descriptions of the pictures.",
            },
            version: {
                bsonType: "int",
                description: "Version of the pictures",
            },
            rarity: {
                bsonType: "int",
                description: "Rarity of the type of picture",
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
