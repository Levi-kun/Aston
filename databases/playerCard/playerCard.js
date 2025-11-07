export const PlayerCard = {
        collectionName: "PlayerCard",
        schema: {
                bsonType: "object",
                required: [
                        "title",
                        "description",
                        "rarityType",
                        "player_id",
                        "moveSet",
                        "base_stats",
                        "type",
                ],
                properties: {
                        _id: { bsonType: "objectId" },

                        title: {
                                bsonType: "string",
                                description:
                                        "Final card title derived from ParentCard.name or overridden by VariantCard.",
                        },

                        description: {
                                bsonType: "string",
                                description:
                                        "Final resolved description (ParentCard.description, overridden by VariantCard if present).",
                        },

                        rarityType: {
                                bsonType: "int",
                                minimum: 1,
                                maximum: 9,
                                description: "Resolved rarity type inherited from VariantCard.",
                        },

                        refPreviousCard: {
                                bsonType: "objectId",
                                description:
                                        "Pointer to the previous iteration of this PlayerCard (empty for the first version).",
                        },

                        player_id: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the Player document that owns this card.",
                        },

                        moveSet: {
                                bsonType: "array",
                                items: { bsonType: "objectId" },
                                description:
                                        "Resolved list of Move document references from SpawnedCard.moveSet.",
                        },

                        baseStats: {
                                bsonType: "object",
                                required: ["power", "level", "defense", "slotCapacity"],
                                properties: {
                                        level: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description: "Level of the card.",
                                        },
                                        power: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description:
                                                        "Effective power value of the card, calculated or assigned upon creation.",
                                        },
                                        defense: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description:
                                                        "Defensive capability of the card, calculated or assigned upon creation.",
                                        },
                                        slotCapacity: {
                                                bsonType: "int",
                                                minimum: 0,
                                                description:
                                                        "Number of slots available for equipping moves/items.",
                                        },
                                },
                        },

                        type: {
                                bsonType: "array",
                                items: { bsonType: "string" },
                                description:
                                        "Inherited from ParentCard.type — e.g., elemental or category tags.",
                        },

                        photoRef: {
                                bsonType: "objectId",
                                description:
                                        "Resolved photo reference: VariantCard.refPhotoRef overrides ParentCard.photoRef if defined.",
                        },

                        equippedItems: {
                                bsonType: "array",
                                items: {
                                        bsonType: "object",
                                        required: ["refItemId"],
                                        properties: {
                                                refItemId: {
                                                        bsonType: "objectId",
                                                        description:
                                                                "Reference to the PlayerItem equipped to this card at snapshot time.",
                                                },
                                                slotIndex: {
                                                        bsonType: "int",
                                                        minimum: 0,
                                                        description:
                                                                "Which slot the item occupied in the card’s inventory layout.",
                                                },
                                        },
                                },
                                description:
                                        "References to PlayerItem documents equipped to this card when the snapshot was created.",
                        },

                        claimedAt: {
                                bsonType: "date",
                                description: "When the card was claimed by the player.",
                        },

                        createdAt: {
                                bsonType: "date",
                                description: "When this snapshot of the card was created.",
                        },
                },
        },
        options: {
                immutable: true,
                description:
                        "Append-only immutable snapshot of a card’s resolved state for a specific player, including equipped items at creation time.",
        },
};
