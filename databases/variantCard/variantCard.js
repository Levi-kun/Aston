export const VariantCard = {
        collectionName: "VariantCard",
        schema: {
                bsonType: "object",
                required: ["refParentCard", "rarityType"],
                properties: {
                        _id: { bsonType: "objectId" },
                        refParentCard: {
                                bsonType: "objectId",
                                description:
                                        "Reference to the ParentCard document this variant is based on.",
                        },
                        rarityType: {
                                bsonType: "int",
                                minimum: 1,
                                maximum: 9,
                                description:
                                        "Variant rarity type ranging from 0 (common) to 5 (mythic).",
                        },
                        description: {
                                bsonType: "string",
                                description: "Overrides the parent description if defined.",
                        },
                        refPhotoRef: {
                                bsonType: "objectId",
                                description:
                                        "Reference to a Photos document that overrides the parent's photoRef if defined.",
                        },
                },
        },
};
