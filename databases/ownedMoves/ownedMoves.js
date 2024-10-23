const ownedMovesSchema = {
	collectionName: "ownedMoves",
	schema: {
		bsonType: "object",
		required: [
			"name",
			"_id",
			"description",
			"version",
			"value",
			"modifiers",
			"duration",
			"card_id",
			"level",
		],
		additionalProperties: false,
		properties: {
			_id: {
				bsonType: "objectId",
				description: "Unique identifier for the owned move",
			},
			name: {
				bsonType: "string",
				minLength: 2,
				maxLength: 32,
				description: "Name of the move",
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
			requirementForm: {
				bsonType: "object",
				description:
					"If ability changes by a condition said new ability is nested here",
				properties: {
					name: {
						bsonType: "string",
					},
					requirement: {
						bsonType: "object",
						description: "requirement",
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
			card_id: {
				bsonType: "objectId",
				description: "ID of the card this move is attached to",
			},
			level: {
				bsonType: "int",
				description: "The level of the move",
			},
		},
	},
};

module.exports = ownedMovesSchema;
