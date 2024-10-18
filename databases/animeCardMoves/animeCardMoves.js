const animemovesListSchema = {
	collectionName: "animeCardMoves",
	schema: {
		bsonType: "object", // Specifies that the root type is an object
		required: [
			"name",
			"_id",
			"description",
			"version",
			"value",
			"specialdmg",
			"ownModifier",
			"parent",
			"duration",
			"otherModifiers",
		],
		additionalProperties: false, // Disallow any fields that are not explicitly defined
		properties: {
			_id: {
				bsonType: "objectId",
				description: "Unique identifier for the moves",
			},
			name: {
				bsonType: "string",
				minLength: 2,
				maxLength: 32,
				description: "Name of the move",
			},
			parent: {
				bsonType: "object",
				description:
					"Category this move belongs to (either card or category)",
				properties: {
					id: {
						bsonType: "string",
						description: "ID of the parent card or category",
					},
					isCard: {
						bsonType: "bool",
						description:
							"True if this is a card-specific ultimate move",
					},
				},
			},
			description: {
				bsonType: "string",
				description: "Description of the move",
			},
			version: {
				bsonType: "int",
				description: "Version of the move",
			},
			value: {
				bsonType: "int",
				description: "Base power value of the move",
			},
			duration: {
				bsonType: "int",
				description: "Duration of the move effect in turns",
			},
			modifiers: {
				bsonType: "array",
				items: {
					bsonType: "object",
					properties: {
						type: {
							bsonType: "string",
							description:
								"Type of modifier (e.g., buff, debuff)",
						},
						target: {
							bsonType: "string",
							description:
								"The attribute (e.g., health, power, that move affects)",
						},
						value: {
							bsonType: "int",
							description: "The value of the modifier",
						},
					},
				},
				description: "Modifies other cards or stats during battle",
			},
			requirmentForm: {
				bsonType: "object",
				description:
					"If ability changes by a condition said new ability is nested here",
				properties: {
					name: {
						bsonType: "string",
					},
					requirment: {
						bsonType: "object",
						description: "requirment",
						properties: {
							type: { bsonType: "string" },
							value: { bsonType: "int" },
						},
					},
					data: {
						bsonType: "object",
						properties: {
							name: {
								bsonType: "string",
								minLength: 2,
								maxLength: 32,
								description: "Name of the move",
							},
							undo: {
								bsonType: "object",
								properties: {
									type: { bsonType: "string" },
									value: { bsonType: "int" },
								},
							},
							modifiers: {
								bsonType: "array",
								items: {
									bsonType: "object",
									properties: {
										type: {
											bsonType: "string",
											description:
												"Type of modifier (e.g., buff, debuff)",
										},
										target: {
											bsonType: "string",
											description:
												"The attribute (e.g., health, power, that move affects)",
										},
										value: {
											bsonType: "int",
											description:
												"The value of the modifier",
										},
									},
								},
								description:
									"Modifies other cards or stats during battle",
							},
						},
					},
				},
			},
		},
	},
};

module.exports = animemovesListSchema;
