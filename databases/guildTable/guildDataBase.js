const guildDataBasetSchema = {
    collectionName: "animeCardtables",
    schema: {
        bsonType: "object", // Specifies that the root type is an object
        required: ["name", "amountofUsers", "gainADAY", "searchADAY"],
        additionalProperties: false, // Disallow any fields that are not explicitly defined}
        _id: {
            bsonType: "objectId",
            description: "Unique identifier for the tables",
        },
        name: {
            bsonType: "string",
            minLength: 2,
            maxLength: 32,
            description: "Name of the tables",
        },
        id: {
            // guild id
            bsonType: "int",
        },
        description: {
            bsonType: "string",
            description: "tables(ies) of the tables.",
        },
        version: {
            bsonType: "int",
            description: "Version of the tables",
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
};

module.exports = { guildDataBasetSchema };
