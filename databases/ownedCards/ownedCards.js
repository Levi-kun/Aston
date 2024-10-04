const ownedCardsSchema = {
    collectionName: "ownedCards",
    schema: {
        bsonType: "object",
        required: [
            "guild_id",
            "rank",
            "card_id",
            "player_id",
            "realPower",
            "inGroup",
        ],
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the owned card",
            },
            guild_id: {
                bsonType: "string",
                description: "ID of the guild where the card is owned",
            },
            vr: {
                bsonType: "int",
                description: "VR rating for the card",
            },
            created_At: {
                bsonType: "date",
                description: "Date and time when the card was created",
            },
            updated_At: {
                bsonType: "date",
                description:
                    "Date and time when the card information was last updated",
            },
            rank: {
                bsonType: "string",
                description: "Rank of the card",
            },
            card_id: {
                bsonType: "int",
                description: "ID of the card",
            },
            player_id: {
                bsonType: "string",
                description: "ID of the player who owns the card",
            },
            realPower: {
                bsonType: "int",
                description: "Real power of the card",
            },
            move_ids: {
                bsonType: "array",
                items: { bsonType: "int" },
                description: "List of move IDs associated with the card",
            },
            inGroup: {
                bsonType: "bool",
                description: "Whether the card is part of a group",
            },
        },
    },
};

module.exports = ownedCardsSchema;
