const pvpMovesSchema = {
    collectionName: "pvpMoves",
    schema: {
        bsonType: "object",
        required: [
            "battle_id",
            "move_id",
            "player_id",
            "move_type",
            "target_card_id",
            "move_at",
        ],
        properties: {
            _id: {
                bsonType: "objectId",
                description: "Unique identifier for the move",
            },
            battle_id: {
                bsonType: "objectId",
                description: "ID of the associated battle",
            },
            move_id: {
                bsonType: "int",
                description: "ID of the move type performed by the player",
            },
            player_id: {
                bsonType: "string",
                description: "ID of the player who performed the move",
            },
            move_type: {
                bsonType: "string",
                description:
                    "Type of move performed (e.g., attack, defense, etc.)",
            },
            special_dmg: {
                bsonType: "int",
                description: "Special damage caused by the move",
                default: 0,
            },
            target_card_id: {
                bsonType: "string",
                description: "ID of the card targeted by the move",
            },
            value: {
                bsonType: "int",
                description:
                    "Value associated with the move (e.g., amount of damage dealt)",
            },
            move_at: {
                bsonType: "date",
                description: "The date and time when the move was made",
            },
            target_value: {
                bsonType: "int",
                description: "Target value modified by the move",
            },
            target_effect: {
                bsonType: "string",
                description: "Effect of the move on the target card",
            },
            modifiers: {
                bsonType: "array",
                description: "Any modifiers that were applied during the move",
                items: { bsonType: "string" },
            },
            real_dmg: {
                bsonType: "int",
                description: "Actual damage dealt after considering modifiers",
            },
        },
    },
};
