const pvpBattlesSchema = {
    collectionName: "pvpBattles",
    schema: {
        bsonType: "object",
        required: [
            "guild_id",
            "challenger_id",
            "challenged_id",
            "status",
            "created_at",
        ],
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the battle",
            },
            guild_id: {
                bsonType: "string",
                description: "ID of the guild where the battle is happening",
            },
            challenger_id: {
                bsonType: "string",
                description: "ID of the challenger user",
            },
            challenged_id: {
                bsonType: "string",
                description: "ID of the user being challenged",
            },
            challenger_cards: {
                bsonType: "array",
                items: { bsonType: "string" },
                description: "List of card IDs used by the challenger",
            },
            challenged_cards: {
                bsonType: "array",
                items: { bsonType: "string" },
                description: "List of card IDs used by the challenged",
            },
            challenger_powers: {
                bsonType: "array",
                items: { bsonType: "string" },
                description:
                    "List of powers associated with the challenger's cards",
            },
            challenged_powers: {
                bsonType: "array",
                items: { bsonType: "string" },
                description:
                    "List of powers associated with the challenged user's cards",
            },
            current_turn: {
                bsonType: "string",
                description: "ID of the player whose turn it currently is",
            },
            status: {
                bsonType: "string",
                description: "Status of the battle (e.g., ongoing, finished)",
            },
            created_at: {
                bsonType: "date",
                description: "The date and time when the battle was created",
            },
            winner_id: {
                bsonType: "string",
                description: "ID of the player who won the battle",
            },
            loser_id: {
                bsonType: "string",
                description: "ID of the player who lost the battle",
            },
            turnCount: {
                bsonType: "int",
                description: "Total number of turns in the battle",
            },
            finished_at: {
                bsonType: "date",
                description: "The date and time when the battle ended",
            },
        },
    },
};

module.exports = pvpBattlesSchema;
